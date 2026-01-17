import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Check if user has INVENTAR role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'INVENTAR') {
      console.error('User does not have INVENTAR role:', roleError);
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

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === email);

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      
      // Check current roles
      const { data: existingRoles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id);

      const hasRole = existingRoles?.some((r) => r.role === role);

      if (hasRole) {
        console.log('User already has this role');
        return new Response(
          JSON.stringify({ error: 'User with this email already exists with this role' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Add the new role
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .insert({ user_id: existingUser.id, role });

      if (roleInsertError) {
        console.error('Error adding role:', roleInsertError);
        return new Response(JSON.stringify({ error: roleInsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update profile if needed
      const updateData: any = {};
      if (role === 'PRODAJALEC' && qr_prefix) {
        updateData.qr_prefix = qr_prefix;
      }

      if (Object.keys(updateData).length > 0) {
        await supabaseClient
          .from('profiles')
          .update(updateData)
          .eq('id', existingUser.id);
      }

      console.log('Role added successfully');
      return new Response(
        JSON.stringify({ message: 'Role added to existing user successfully' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Add role
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError);
      return new Response(JSON.stringify({ error: roleInsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update profile with role-specific data
    const profileUpdateData: any = {};
    if (role === 'PRODAJALEC' && qr_prefix) {
      profileUpdateData.qr_prefix = qr_prefix;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await supabaseClient
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', newUser.user.id);
    }

    console.log('User created successfully with role:', role);
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
