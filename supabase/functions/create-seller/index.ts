import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requesting user has INVENTAR role
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has INVENTAR role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'INVENTAR')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - INVENTAR role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, qr_prefix } = await req.json();

    // Check if user already exists by email
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      // User exists - check if they have PRODAJALEC role
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', existingProfile.id)
        .eq('role', 'PRODAJALEC')
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ 
            error: 'Seller already exists',
            message: `${existingProfile.full_name} je že prodajalec v sistemu.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User exists but doesn't have PRODAJALEC role - add it
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: existingProfile.id,
          role: 'PRODAJALEC',
        });

      if (roleInsertError) {
        throw roleInsertError;
      }

      // Update profile with QR prefix and name if provided
      if (qr_prefix || full_name) {
        const updates: any = {};
        if (qr_prefix) updates.qr_prefix = qr_prefix.toUpperCase();
        if (full_name) updates.full_name = full_name;

        const { error: profileUpdateError } = await supabaseClient
          .from('profiles')
          .update(updates)
          .eq('id', existingProfile.id);

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `${full_name} je bil uspešno dodan kot prodajalec.`,
          user_id: existingProfile.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User doesn't exist - create new account
    const { data: authData, error: signUpError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (signUpError || !authData.user) {
      throw signUpError || new Error('Failed to create user');
    }

    // Update profile with QR prefix
    if (qr_prefix) {
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update({ qr_prefix: qr_prefix.toUpperCase() })
        .eq('id', authData.user.id);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
      }
    }

    // Insert PRODAJALEC role
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'PRODAJALEC',
      });

    if (roleInsertError) {
      throw roleInsertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Prodajalec ${full_name} je bil uspešno dodan.`,
        user_id: authData.user.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
