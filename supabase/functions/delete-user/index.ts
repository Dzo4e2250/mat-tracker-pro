import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      } 
    });
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an ADMIN
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'ADMIN')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Only ADMIN users can delete users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id } = await req.json();

    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Ne morete izbrisati svojega računa' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // First, delete all related data to avoid foreign key constraints
    console.log('Deleting related data for user:', user_id);
    
    // Delete contacts
    const { error: contactsError } = await supabaseClient
      .from('contacts')
      .delete()
      .eq('seller_id', user_id);
    
    if (contactsError) {
      console.error('Error deleting contacts:', contactsError);
    }

    // Delete test placements (set status to deleted instead of actual deletion)
    const { error: testPlacementsError } = await supabaseClient
      .from('test_placements')
      .update({ status: 'deleted' })
      .eq('seller_id', user_id);
    
    if (testPlacementsError) {
      console.error('Error updating test placements:', testPlacementsError);
    }

    // Delete tester requests
    const { error: testerRequestsError } = await supabaseClient
      .from('tester_requests')
      .delete()
      .eq('seller_id', user_id);
    
    if (testerRequestsError) {
      console.error('Error deleting tester requests:', testerRequestsError);
    }

    // Update doormats to remove seller_id reference
    const { error: doormatsError } = await supabaseClient
      .from('doormats')
      .update({ seller_id: null })
      .eq('seller_id', user_id);
    
    if (doormatsError) {
      console.error('Error updating doormats:', doormatsError);
    }

    // Now delete the user (this will cascade to profiles and user_roles)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Uporabnik uspešno izbrisan' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
