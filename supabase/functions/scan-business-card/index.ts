import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matpro.reitti.cloud',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DB_SCHEMA = Deno.env.get('DB_SCHEMA') || 'mat_tracker';

// OCR extraction prompt
const EXTRACTION_PROMPT = `Analiziraj sliko vizitke in izvleci podatke. POMEMBNO: loci med PODJETJEM in POSLOVNO ENOTO (PE/poslovalnico).

=== RAG PRAVILA ZA RAZLOCEVANJE ===
1. COMPANY_NAME = uradno ime podjetja. Doloci ga iz: logotipa, email domene (del pred @, npr. info@euronova.si → "Euronova"), domene spletne strani (npr. www.euronova.si → "Euronova"), ali najvecjega/najvidnejsega napisa. NIKOLI ne uporabi imena poslovalnice kot company_name. NE dodajaj "d.o.o." ali "s.p." razen ce je eksplicitno napisano na vizitki.
2. BRANCH_NAME = ime poslovalnice/PE, ce obstaja. Pogosti vzorci: "PE Maribor", "Poslovalnica Ljubljana", "Podruznica Celje", ime mesta brez "PE" ce je ocitno poslovalnica.
3. Ce vizitka pise "PE MARIBOR" in email je "maribor@euronova.si" → company_name="Euronova", branch_name="PE Maribor"
4. Ce vizitka pise samo ime podjetja brez PE oznake → branch_name=null
5. NASLOV na vizitki je obicajno naslov POSLOVALNICE (branch), ne sedeža podjetja. Ce je branch_name prisoten, daj naslov v branch_address_* polja. Ce ni PE oznake, daj naslov v address_* polja.
6. DAVCNA STEVILKA: 8 stevk, brez predpone "SI". Ce je na vizitki "SI12345678", izvleci samo "12345678".
7. Ce so na vizitki dva naslova - en je sedez, drug poslovalnica - pravilno razporedi.

Vrni JSON objekt:
{
  "company_name": "uradno ime podjetja (iz logotipa/domene)",
  "branch_name": "ime poslovalnice ali null",
  "person_name": "ime in priimek ali null",
  "person_role": "vloga/funkcija ali null",
  "phone": "telefonska (s +386) ali null",
  "email": "email ali null",
  "website": "spletna stran ali null",
  "address_street": "ulica sedeza podjetja ali null",
  "address_postal": "postna sedeza ali null",
  "address_city": "kraj sedeza ali null",
  "branch_address_street": "ulica poslovalnice ali null",
  "branch_address_postal": "postna poslovalnice ali null",
  "branch_address_city": "kraj poslovalnice ali null",
  "tax_number": "8 stevk brez SI ali null"
}

Ce ni jasno ali je sedez ali PE, daj naslov v branch_address_* polja (register bo dal pravi sedez).
Vrni SAMO JSON brez dodatnega besedila.`;

// Smart matching prompt
function getSmartMatchPrompt(extractedData: any, candidates: any[]) {
  return `Imam podatke iz vizitke in seznam kandidatov iz poslovnega registra. Doloci kateri kandidat je najverjetnejse pravo ujemanje.

Izvleceni podatki iz vizitke:
- Ime podjetja: ${extractedData.company_name || 'ni podatka'}
- Naslov: ${extractedData.address_street || ''} ${extractedData.address_postal || ''} ${extractedData.address_city || ''}
- Davcna: ${extractedData.tax_number || 'ni podatka'}

Kandidati iz registra:
${candidates.map((c, i) => `${i}: ${c.name} | ${c.address_street || ''} ${c.address_postal || ''} ${c.address_city || ''} | Davcna: ${c.tax_number || 'ni'} | Podobnost: ${(c.similarity_score * 100).toFixed(0)}%`).join('\n')}

Vrni JSON objekt:
{
  "best_match_index": <stevilka kandidata ali -1 ce ni dobrega ujemanja>,
  "confidence": <"high", "medium" ali "low">,
  "reasoning": "<kratka razlaga zakaj si izbral ta kandidat>"
}
Vrni SAMO JSON.`;
}

// AI provider API calls
async function callOpenAI(apiKey: string, model: string, prompt: string, imageBase64?: string) {
  const messages: any[] = [];
  const content: any[] = [];

  if (imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' },
    });
  }
  content.push({ type: 'text', text: prompt });
  messages.push({ role: 'user', content });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callAnthropic(apiKey: string, model: string, prompt: string, imageBase64?: string) {
  const content: any[] = [];

  if (imageBase64) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
    });
  }
  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content[0].text;
  // Extract JSON from response (may have markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Anthropic response');
  return JSON.parse(jsonMatch[0]);
}

async function callGoogle(apiKey: string, model: string, prompt: string, imageBase64?: string) {
  const parts: any[] = [];

  if (imageBase64) {
    parts.push({
      inline_data: { mime_type: 'image/jpeg', data: imageBase64 },
    });
  }
  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
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

async function callAI(provider: string, apiKey: string, model: string, prompt: string, imageBase64?: string) {
  switch (provider) {
    case 'openai': return callOpenAI(apiKey, model, prompt, imageBase64);
    case 'anthropic': return callAnthropic(apiKey, model, prompt, imageBase64);
    case 'google': return callGoogle(apiKey, model, prompt, imageBase64);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[scan] Starting...');

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
    console.log('[scan] Verifying auth...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('[scan] Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[scan] User:', user.id);
    const { image_base64 } = await req.json();
    console.log('[scan] Image size:', image_base64?.length || 0, 'chars');

    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'Missing image_base64' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Get AI settings (decrypted)
    console.log('[scan] Getting AI settings...');
    const { data: aiSettings, error: settingsError } = await supabaseClient.rpc(
      'get_ai_settings_decrypted',
      { p_user_id: user.id }
    );

    if (settingsError) {
      console.error('[scan] Settings RPC error:', JSON.stringify(settingsError));
    }

    if (settingsError || !aiSettings || aiSettings.length === 0) {
      console.error('[scan] No AI settings found');
      return new Response(
        JSON.stringify({ error: 'AI nastavitve niso konfigurirane. Pojdite v Nastavitve profila > AI nastavitve.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = aiSettings[0];
    const { provider, decrypted_key: apiKey, fast_model: fastModel, smart_model: smartModel } = settings;
    console.log('[scan] Provider:', provider, 'Fast:', fastModel, 'Smart:', smartModel);
    console.log('[scan] API key starts with:', apiKey?.substring(0, 8) + '...');

    // Step 2: FAST model - OCR extraction
    console.log('[scan] Step 2: Calling FAST model for OCR...');
    let extractedData: any;
    try {
      extractedData = await callAI(provider, apiKey, fastModel, EXTRACTION_PROMPT, image_base64);
      console.log('[scan] OCR result:', JSON.stringify(extractedData));
    } catch (err: any) {
      console.error('[scan] OCR extraction error:', err.message);
      return new Response(
        JSON.stringify({ error: `Napaka pri AI ekstrakciji: ${err.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: DB search
    console.log('[scan] Step 3: DB search...');
    let matchResult: any = { matched_company: null, candidates: [], confidence: 'none', method: 'none' };

    // 3a: Exact tax number match
    if (extractedData.tax_number) {
      const cleanTax = extractedData.tax_number.replace(/^SI/i, '').replace(/\s/g, '');
      console.log('[scan] 3a: Exact tax search:', cleanTax);
      const { data: taxMatch, error: taxError } = await supabaseClient
        .from('slovenian_companies' as any)
        .select('*')
        .eq('tax_number', cleanTax)
        .limit(1);

      if (taxError) console.error('[scan] Tax search error:', JSON.stringify(taxError));
      console.log('[scan] Tax match results:', taxMatch?.length || 0);

      if (taxMatch && taxMatch.length > 0) {
        matchResult = {
          matched_company: taxMatch[0],
          candidates: [],
          confidence: 'high',
          method: 'tax_number_exact',
        };
      }
    } else {
      console.log('[scan] 3a: No tax number extracted, skipping exact match');
    }

    // 3b: Fuzzy name search if no exact match
    if (matchResult.confidence === 'none' && extractedData.company_name) {
      // First try with city filter, then without if no results (company HQ may be in different city than branch)
      console.log('[scan] 3b: Fuzzy search for:', extractedData.company_name, 'city:', extractedData.address_city);
      let fuzzyResults: any[] | null = null;
      let fuzzyError: any = null;

      if (extractedData.address_city) {
        const res = await supabaseClient.rpc('search_companies_fuzzy', {
          p_name: extractedData.company_name,
          p_city: extractedData.address_city,
          p_limit: 10,
        });
        fuzzyResults = res.data;
        fuzzyError = res.error;
        if (fuzzyError) console.error('[scan] Fuzzy search (with city) error:', JSON.stringify(fuzzyError));
        console.log('[scan] Fuzzy results (with city):', fuzzyResults?.length || 0);
      }

      // Retry without city if no results
      if (!fuzzyResults || fuzzyResults.length === 0) {
        console.log('[scan] Retrying fuzzy search without city filter...');
        const res = await supabaseClient.rpc('search_companies_fuzzy', {
          p_name: extractedData.company_name,
          p_city: null,
          p_limit: 10,
        });
        fuzzyResults = res.data;
        fuzzyError = res.error;
        if (fuzzyError) console.error('[scan] Fuzzy search (no city) error:', JSON.stringify(fuzzyError));
        console.log('[scan] Fuzzy results (no city):', fuzzyResults?.length || 0);
      }

      if (fuzzyError) console.error('[scan] Fuzzy search error:', JSON.stringify(fuzzyError));
      console.log('[scan] Fuzzy results:', fuzzyResults?.length || 0);
      if (fuzzyResults?.length > 0) {
        console.log('[scan] Best match:', fuzzyResults[0].name, 'score:', fuzzyResults[0].similarity_score);
      }

      if (!fuzzyError && fuzzyResults && fuzzyResults.length > 0) {
        const bestMatch = fuzzyResults[0];

        if (bestMatch.similarity_score > 0.6) {
          console.log('[scan] High confidence match!');
          matchResult = {
            matched_company: bestMatch,
            candidates: fuzzyResults.slice(1, 6),
            confidence: 'high',
            method: 'fuzzy_name',
          };
        } else if (bestMatch.similarity_score > 0.3) {
          console.log('[scan] Medium - calling SMART model...');
          try {
            const smartResult = await callAI(
              provider, apiKey, smartModel,
              getSmartMatchPrompt(extractedData, fuzzyResults)
            );
            console.log('[scan] Smart result:', JSON.stringify(smartResult));

            if (smartResult.best_match_index >= 0 && smartResult.best_match_index < fuzzyResults.length) {
              matchResult = {
                matched_company: fuzzyResults[smartResult.best_match_index],
                candidates: fuzzyResults.filter((_: any, i: number) => i !== smartResult.best_match_index).slice(0, 5),
                confidence: smartResult.confidence || 'medium',
                method: 'smart_reasoning',
                reasoning: smartResult.reasoning,
              };
            } else {
              matchResult = {
                matched_company: null,
                candidates: fuzzyResults.slice(0, 5),
                confidence: 'low',
                method: 'smart_no_match',
                reasoning: smartResult.reasoning,
              };
            }
          } catch (err: any) {
            console.error('[scan] Smart model error:', err.message);
            matchResult = {
              matched_company: bestMatch,
              candidates: fuzzyResults.slice(1, 6),
              confidence: 'medium',
              method: 'fuzzy_name_fallback',
            };
          }
        } else {
          console.log('[scan] Low similarity, best:', bestMatch.similarity_score);
          matchResult = {
            matched_company: null,
            candidates: fuzzyResults.slice(0, 5),
            confidence: 'low',
            method: 'fuzzy_low',
          };
        }
      } else {
        console.log('[scan] No fuzzy results found');
      }
    }

    console.log('[scan] Final result - confidence:', matchResult.confidence, 'method:', matchResult.method);

    return new Response(
      JSON.stringify({
        extracted_data: extractedData,
        match: matchResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[scan] Unexpected error:', error.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
