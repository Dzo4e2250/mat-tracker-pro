/**
 * @file useEmailTemplates.ts
 * @description CRUD hook za user_email_templates + seeding privzetih predlog
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserEmailTemplate, UserEmailTemplateInsert } from '@/integrations/supabase/types';
import { QUERY_KEYS } from '@/constants/queryKeys';

// Default templates matching the hardcoded text in useOfferEmail.ts
const DEFAULT_TEMPLATES: Omit<UserEmailTemplateInsert, 'user_id'>[] = [
  {
    name: 'Najem - privzeta',
    template_type: 'najem',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. V spodnji tabeli so navedene dimenzije, cene in pogostost menjave.',
    service_text: 'Ponudba vključuje redno menjavo umazanih predpražnikov s čistimi v dogovorjenih intervalih ter strošek pranja in dostave.',
    closing_text: 'Za vsa dodatna vprašanja ali morebitne prilagoditve ponudbe sem vam z veseljem na voljo.',
    seasonal_text: 'Kot dogovorjeno, ponudba vključuje tudi sezonsko prilagoditev s pogostejšo menjavo v obdobju povečanega obiska.',
    is_default: true,
    is_active: true,
  },
  {
    name: 'Nakup - privzeta',
    template_type: 'nakup',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za nakup profesionalnih predpražnikov. Podrobnosti o dimenzijah in cenah se nahajajo v spodnji tabeli.',
    service_text: 'Predpražniki so visoke kakovosti in primerni za dolgotrajno uporabo.',
    closing_text: 'Za vsa dodatna vprašanja glede materialov ali dobavnih rokov sem vam na voljo.',
    seasonal_text: '',
    is_default: true,
    is_active: true,
  },
  {
    name: 'Primerjava najem/nakup - privzeta',
    template_type: 'primerjava',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za najem, prav tako pa spodaj prilagam tudi ponudbo za nakup predpražnikov, da lahko primerjate obe možnosti.',
    service_text: '',
    closing_text: 'Za vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.',
    seasonal_text: 'Kot dogovorjeno, ponudba vključuje tudi sezonsko prilagoditev s pogostejšo menjavo v obdobju povečanega obiska.',
    is_default: true,
    is_active: true,
  },
  {
    name: 'Primerjava 2x dimenziji - privzeta',
    template_type: 'primerjava',
    intro_text: 'kot dogovorjeno sem pripravil informativno ponudbo za dve najpogostejši standardni dimenziji.',
    service_text: 'Cena vključuje predpražnik, redno menjavo in čiščenje.',
    closing_text: 'Za vsa dodatna vprašanja ali pomoč pri izbiri optimalne rešitve sem vam z veseljem na voljo.',
    seasonal_text: 'Cena vključuje predpražnik, redno menjavo, čiščenje in sezonsko prilagoditev (pogostejša menjava v času slabšega vremena).',
    is_default: false,
    is_active: true,
  },
  {
    name: 'Dodatna (najem + nakup) - privzeta',
    template_type: 'dodatna',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov. Prav tako vam v nadaljevanju pošiljam še ponudbo za nakup.',
    service_text: 'Vključuje servis in menjavo po dogovoru.',
    closing_text: 'Za vsa dodatna vprašanja sem vam na voljo.',
    seasonal_text: '',
    is_default: true,
    is_active: true,
  },
  {
    name: 'Dodatna (samo najem) - privzeta',
    template_type: 'dodatna',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za najem predpražnikov.',
    service_text: 'Vključuje servis in menjavo po dogovoru.',
    closing_text: 'Za vsa dodatna vprašanja sem vam na voljo.',
    seasonal_text: '',
    is_default: false,
    is_active: true,
  },
  {
    name: 'Dodatna (samo nakup) - privzeta',
    template_type: 'dodatna',
    intro_text: 'kot dogovorjeno pošiljam ponudbo za nakup predpražnikov.',
    service_text: 'Predpražniki za nakup v trajno last (brez menjave).',
    closing_text: 'Za vsa dodatna vprašanja sem vam na voljo.',
    seasonal_text: '',
    is_default: false,
    is_active: true,
  },
];

// Generate fallback templates with fake IDs (for when DB table doesn't exist yet)
function getFallbackTemplates(userId: string): UserEmailTemplate[] {
  return DEFAULT_TEMPLATES.map((t, i) => ({
    id: `fallback-${i}`,
    user_id: userId,
    name: t.name!,
    template_type: t.template_type! as UserEmailTemplate['template_type'],
    intro_text: t.intro_text || '',
    service_text: t.service_text || '',
    closing_text: t.closing_text || '',
    seasonal_text: t.seasonal_text || null,
    block_order: null,
    is_default: t.is_default ?? false,
    is_active: t.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export function useEmailTemplates(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.emailTemplates(userId);

  // Fetch templates + seed defaults if none exist
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];

      try {
        const { data, error } = await supabase
          .from('user_email_templates')
          .select('*')
          .eq('user_id', userId)
          .order('template_type')
          .order('is_default', { ascending: false })
          .order('name');

        if (error) {
          // Table doesn't exist yet - return fallback defaults
          console.warn('[useEmailTemplates] DB query failed, using fallback defaults:', error.message);
          return getFallbackTemplates(userId);
        }

        // Seed defaults if user has no templates yet
        if (!data || data.length === 0) {
          const inserts = DEFAULT_TEMPLATES.map(t => ({ ...t, user_id: userId }));
          const { error: seedError } = await supabase
            .from('user_email_templates')
            .insert(inserts);

          if (seedError) {
            // Race condition: another tab may have seeded already - re-fetch
            const { data: refetched } = await supabase
              .from('user_email_templates')
              .select('*')
              .eq('user_id', userId)
              .order('template_type')
              .order('is_default', { ascending: false })
              .order('name');
            if (refetched && refetched.length > 0) return refetched as UserEmailTemplate[];
            console.warn('[useEmailTemplates] Seeding failed, using fallback defaults:', seedError.message);
            return getFallbackTemplates(userId);
          }
          // Re-fetch to get proper IDs and ordering
          const { data: seeded } = await supabase
            .from('user_email_templates')
            .select('*')
            .eq('user_id', userId)
            .order('template_type')
            .order('is_default', { ascending: false })
            .order('name');
          return (seeded || []) as UserEmailTemplate[];
        }

        return data as UserEmailTemplate[];
      } catch (err) {
        console.warn('[useEmailTemplates] Unexpected error, using fallback defaults:', err);
        return getFallbackTemplates(userId);
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30s - shorter to catch Settings→Contacts transitions
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Re-fetch on route change (component remount)
  });

  // Get templates for a specific type - memoized to avoid new array every render
  const getTemplatesForType = useCallback((type: string) =>
    (templates || []).filter(t => t.template_type === type && t.is_active),
    [templates]
  );

  // Get active template for a type (first active one, or default)
  const getActiveTemplate = useCallback((type: string): UserEmailTemplate | undefined => {
    const typeTemplates = getTemplatesForType(type);
    return typeTemplates.find(t => t.is_default) || typeTemplates[0];
  }, [getTemplatesForType]);

  // Check if using fallback (DB not available)
  const isFallback = (templates || []).some(t => t.id.startsWith('fallback-'));

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<UserEmailTemplateInsert, 'user_id'>) => {
      if (!userId) throw new Error('No user ID');
      const { data, error } = await supabase
        .from('user_email_templates')
        .insert({ ...template, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as UserEmailTemplate;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<UserEmailTemplate>) => {
      const { data, error } = await supabase
        .from('user_email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as UserEmailTemplate;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    templates: templates || [],
    isLoading,
    isFallback,
    refetch,
    getTemplatesForType,
    getActiveTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
