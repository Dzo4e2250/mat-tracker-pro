import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matpro.reitti.cloud',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an admin or inventar (using profiles table - canonical role source)
    const { data: profileData, error: profileError } = await supabaseClient
      .schema('mat_tracker')
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData || !['admin', 'inventar'].includes(profileData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only admin and inventar users can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id } = await req.json();

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Ne morete izbrisati svojega računa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Delete auth user FIRST to prevent login during cleanup
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Clean up related data (user can no longer login at this point)
    const cleanupErrors: string[] = [];

    const { error: contactsError } = await supabaseClient
      .schema('mat_tracker')
      .from('contacts')
      .delete()
      .eq('seller_id', user_id);
    if (contactsError) cleanupErrors.push('contacts');

    const { error: testPlacementsError } = await supabaseClient
      .schema('mat_tracker')
      .from('test_placements')
      .update({ status: 'deleted', seller_id: null })
      .eq('seller_id', user_id);
    if (testPlacementsError) cleanupErrors.push('test_placements');

    const { error: testerRequestsError } = await supabaseClient
      .schema('mat_tracker')
      .from('tester_requests')
      .delete()
      .eq('seller_id', user_id);
    if (testerRequestsError) cleanupErrors.push('tester_requests');

    const { error: doormatsError } = await supabaseClient
      .schema('mat_tracker')
      .from('doormats')
      .update({ seller_id: null })
      .eq('seller_id', user_id);
    if (doormatsError) cleanupErrors.push('doormats');

    const { error: userRolesError } = await supabaseClient
      .schema('mat_tracker')
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);
    if (userRolesError) cleanupErrors.push('user_roles');

    const { error: profilesError } = await supabaseClient
      .schema('mat_tracker')
      .from('profiles')
      .delete()
      .eq('id', user_id);
    if (profilesError) cleanupErrors.push('profiles');

    if (cleanupErrors.length > 0) {
      console.error('Cleanup errors for deleted user:', user_id, cleanupErrors);
    }

    return new Response(
      JSON.stringify({ message: 'Uporabnik uspešno izbrisan' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
