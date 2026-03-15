import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matpro.reitti.cloud',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DB_SCHEMA = Deno.env.get('DB_SCHEMA') || 'mat_tracker';

const GENERATION_PROMPT = `Si strokovnjak za pisanje profesionalnih poslovnih emailov v slovenščini. Generiraj besedila za email ponudbo predpražnikov.

Tip ponudbe: {template_type}

Opis tipov:
- najem: ponudba za najem predpražnikov z redno menjavo in čiščenjem
- nakup: ponudba za nakup predpražnikov v trajno last
- primerjava: primerjava najema in nakupa
- dodatna: kombinirana ponudba (najem + nakup)

Generiraj 4 besedila v slovenščini, ki so profesionalna, prijazna in prepričljiva. Besedila morajo biti primerna za B2B komunikacijo.

Vrni JSON objekt:
{
  "intro_text": "uvodno besedilo po 'Pozdravljeni,' - opiši kaj pošiljaš (1-2 stavka, brez 'Pozdravljeni,')",
  "service_text": "opis kaj ponudba vključuje - storitev menjave, čiščenja, dostave (1-2 stavka)",
  "closing_text": "zaključno besedilo pred 'Lep pozdrav,' - povabi k vprašanjem (1 stavek)",
  "seasonal_text": "besedilo o sezonski prilagoditvi - pogostejša menjava v zimskem času (1 stavek, ali prazen string če ni relevantno za tip)"
}

PRAVILA:
- NE vključuj "Pozdravljeni," ali "Lep pozdrav," - to se doda avtomatsko
- Piši v 1. osebi ednine (jaz pošiljam, sem na voljo)
- intro_text naj se začne z malo začetnico (ker sledi za vejico za "Pozdravljeni,")
- Bodi jedrnat - vsako besedilo max 2 stavka
- seasonal_text: za nakup vrni prazen string ""

Vrni SAMO JSON brez dodatnega besedila.`;

// AI provider API calls (text-only, no image)
async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callAnthropic(apiKey: string, model: string, prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Anthropic response');
  return JSON.parse(jsonMatch[0]);
}

async function callGoogle(apiKey: string, model: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Google response');
  return JSON.parse(jsonMatch[0]);
}

async function callAI(provider: string, apiKey: string, model: string, prompt: string) {
  switch (provider) {
    case 'openai': return callOpenAI(apiKey, model, prompt);
    case 'anthropic': return callAnthropic(apiKey, model, prompt);
    case 'google': return callGoogle(apiKey, model, prompt);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: DB_SCHEMA },
      }
    );

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { template_type, custom_prompt } = await req.json();

    if (!template_type || !['najem', 'nakup', 'primerjava', 'dodatna', 'custom'].includes(template_type)) {
      return new Response(JSON.stringify({ error: 'Invalid template_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get AI settings (decrypted)
    const { data: aiSettings, error: settingsError } = await supabaseClient.rpc(
      'get_ai_settings_decrypted',
      { p_user_id: user.id }
    );

    if (settingsError || !aiSettings || aiSettings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'AI nastavitve niso konfigurirane. Pojdite v Nastavitve > Profil > AI nastavitve.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = aiSettings[0];
    const { provider, decrypted_key: apiKey, fast_model: model } = settings;

    // Generate email text
    let prompt = GENERATION_PROMPT.replace('{template_type}', template_type);
    if (custom_prompt && typeof custom_prompt === 'string' && custom_prompt.trim()) {
      prompt = prompt.replace(
        'PRAVILA:',
        `DODATNA NAVODILA UPORABNIKA:\n${custom_prompt.trim()}\n\nPRAVILA:`
      );
    }
    const result = await callAI(provider, apiKey, model, prompt);

    // Validate result has required fields
    const requiredFields = ['intro_text', 'service_text', 'closing_text', 'seasonal_text'];
    for (const field of requiredFields) {
      if (typeof result[field] !== 'string') {
        result[field] = '';
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-email-text] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
