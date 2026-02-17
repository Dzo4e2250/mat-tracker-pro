import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matpro.reitti.cloud',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DB_SCHEMA = Deno.env.get('DB_SCHEMA') || 'mat_tracker';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[save-ai-settings] Starting, schema:', DB_SCHEMA);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: DB_SCHEMA },
      }
    );

    // Auth: verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[save-ai-settings] No auth header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[save-ai-settings] Verifying token...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('[save-ai-settings] Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[save-ai-settings] User verified:', user.id);

    const { provider, api_key, fast_model, smart_model } = await req.json();

    if (!provider || !api_key || !fast_model || !smart_model) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['openai', 'anthropic', 'google'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[save-ai-settings] Calling RPC save_ai_setting for provider:', provider);

    // Call the save function (SECURITY DEFINER handles encryption)
    const { error: rpcError } = await supabaseClient.rpc('save_ai_setting', {
      p_user_id: user.id,
      p_provider: provider,
      p_api_key: api_key,
      p_fast_model: fast_model,
      p_smart_model: smart_model,
    });

    if (rpcError) {
      console.error('[save-ai-settings] RPC error:', JSON.stringify(rpcError));
      return new Response(JSON.stringify({ error: 'Napaka pri shranjevanju nastavitev' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[save-ai-settings] Success!');

    return new Response(
      JSON.stringify({ message: 'AI nastavitve shranjene' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[save-ai-settings] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
