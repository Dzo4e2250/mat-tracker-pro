import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matpro.reitti.cloud',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use mat_tracker schema
const DB_SCHEMA = Deno.env.get('DB_SCHEMA') || 'mat_tracker';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: DB_SCHEMA,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.email);

    // Check if user has inventar role (from profiles table) - either as primary or secondary role
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, secondary_role')
      .eq('id', user.id)
      .single();

    const hasInventarRole = profileData?.role === 'inventar' || profileData?.secondary_role === 'inventar';

    if (profileError || !profileData || !hasInventarRole) {
      console.error('User does not have inventar role:', profileError, 'role:', profileData?.role, 'secondary_role:', profileData?.secondary_role);
      return new Response(JSON.stringify({ error: 'Only inventory managers can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, full_name, qr_prefix, role } = await req.json();

    if (!email || !password || !full_name || !role) {
      console.log('Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (role !== 'INVENTAR' && role !== 'PRODAJALEC') {
      console.log('Invalid role:', role);
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For PRODAJALEC, qr_prefix is required
    if (role === 'PRODAJALEC' && !qr_prefix) {
      console.log('QR prefix required for PRODAJALEC');
      return new Response(JSON.stringify({ error: 'QR prefix is required for sellers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating user with role:', role);

    // Convert role to lowercase for database (profiles.role uses lowercase)
    const dbRole = role.toLowerCase();

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === email);

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return new Response(
        JSON.stringify({ error: 'Uporabnik s tem emailom že obstaja' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse full_name into first_name and last_name
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create new user
    console.log('Creating new user');
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created:', newUser.user.id);

    // Create profile for the new user (role is stored in profiles.role column)
    const profileInsertData: any = {
      id: newUser.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: dbRole,
      is_active: true,
    };

    // Add code_prefix for prodajalec
    if (role === 'PRODAJALEC' && qr_prefix) {
      profileInsertData.code_prefix = qr_prefix.toUpperCase();
    }

    const { error: profileInsertError } = await supabaseClient
      .from('profiles')
      .insert(profileInsertData);

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // If profile creation fails, we should delete the auth user
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: profileInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User and profile created successfully with role:', role);
    return new Response(
      JSON.stringify({ message: `${role === 'INVENTAR' ? 'Inventar' : 'Prodajalec'} account created successfully` }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
