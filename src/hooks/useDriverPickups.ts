import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PickupStatus = 'pending' | 'in_progress' | 'completed';

export interface PickupItem {
  id: string;
  cycleId: string;
  qrCode: string;
  matTypeName: string;
  companyName: string | null;
  companyAddress: string | null;
  contactName: string | null;
  contactPhone: string | null;
  pickedUp: boolean;
  pickedUpAt: string | null;
  notes: string | null;
}

export interface DriverPickup {
  id: string;
  status: PickupStatus;
  scheduledDate: string | null;
  completedAt: string | null;
  assignedDriver: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  items: PickupItem[];
}

// Fetch all driver pickups
export function useDriverPickups(status?: PickupStatus | PickupStatus[]) {
  return useQuery({
    queryKey: ['driver-pickups', status],
    queryFn: async (): Promise<DriverPickup[]> => {
      let query = supabase
        .from('driver_pickups')
        .select(`
          id,
          status,
          scheduled_date,
          completed_at,
          assigned_driver,
          notes,
          created_at,
          created_by,
          driver_pickup_items(
            id,
            cycle_id,
            picked_up,
            picked_up_at,
            notes,
            cycles(
              id,
              qr_codes(code),
              mat_types(code, name),
              companies(name, address_street, address_city),
              contacts(first_name, last_name, phone)
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by status if specified
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((pickup: any) => ({
        id: pickup.id,
        status: pickup.status,
        scheduledDate: pickup.scheduled_date,
        completedAt: pickup.completed_at,
        assignedDriver: pickup.assigned_driver,
        notes: pickup.notes,
        createdAt: pickup.created_at,
        createdBy: pickup.created_by,
        items: (pickup.driver_pickup_items || []).map((item: any) => ({
          id: item.id,
          cycleId: item.cycle_id,
          qrCode: item.cycles?.qr_codes?.code || '',
          matTypeName: item.cycles?.mat_types?.code || item.cycles?.mat_types?.name || 'Neznano',
          companyName: item.cycles?.companies?.name || null,
          companyAddress: item.cycles?.companies
            ? `${item.cycles.companies.address_street || ''}, ${item.cycles.companies.address_city || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
            : null,
          contactName: item.cycles?.contacts
            ? `${item.cycles.contacts.first_name || ''} ${item.cycles.contacts.last_name || ''}`.trim()
            : null,
          contactPhone: item.cycles?.contacts?.phone || null,
          pickedUp: item.picked_up || false,
          pickedUpAt: item.picked_up_at,
          notes: item.notes,
        })),
      }));
    },
  });
}

// Fetch active pickups (pending and in_progress)
export function useActivePickups() {
  return useDriverPickups(['pending', 'in_progress']);
}

// Create a new driver pickup
export function useCreateDriverPickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleIds,
      scheduledDate,
      assignedDriver,
      notes,
      createdBy,
    }: {
      cycleIds: string[];
      scheduledDate?: string;
      assignedDriver?: string;
      notes?: string;
      createdBy?: string;
    }) => {
      // Create the pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('driver_pickups')
        .insert({
          status: 'pending',
          scheduled_date: scheduledDate || null,
          assigned_driver: assignedDriver || null,
          notes: notes || null,
          created_by: createdBy || null,
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      // Create pickup items
      const items = cycleIds.map((cycleId) => ({
        pickup_id: pickup.id,
        cycle_id: cycleId,
        picked_up: false,
      }));

      const { error: itemsError } = await supabase
        .from('driver_pickup_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Update cycle statuses to waiting_driver
      const { error: updateError } = await supabase
        .from('cycles')
        .update({
          status: 'waiting_driver',
          pickup_requested_at: new Date().toISOString(),
        })
        .in('id', cycleIds);

      if (updateError) throw updateError;

      return pickup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

// Update pickup status
export function useUpdatePickupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pickupId,
      status,
    }: {
      pickupId: string;
      status: PickupStatus;
    }) => {
      const updates: any = { status };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('driver_pickups')
        .update(updates)
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
    },
  });
}

// Mark a pickup item as picked up
export function useMarkItemPickedUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      pickedUp,
      notes,
    }: {
      itemId: string;
      pickedUp: boolean;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('driver_pickup_items')
        .update({
          picked_up: pickedUp,
          picked_up_at: pickedUp ? new Date().toISOString() : null,
          notes: notes || null,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
    },
  });
}

// Complete a pickup and update all related cycles
export function useCompletePickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pickupId: string) => {
      // Get all items in this pickup
      const { data: items, error: itemsError } = await supabase
        .from('driver_pickup_items')
        .select('cycle_id')
        .eq('pickup_id', pickupId);

      if (itemsError) throw itemsError;

      const cycleIds = items?.map((item) => item.cycle_id) || [];

      // Update all cycles to completed
      if (cycleIds.length > 0) {
        const { error: cyclesError } = await supabase
          .from('cycles')
          .update({
            status: 'completed',
            driver_pickup_at: new Date().toISOString(),
          })
          .in('id', cycleIds);

        if (cyclesError) throw cyclesError;

        // Reset QR codes to available
        const { data: cycles, error: qrError } = await supabase
          .from('cycles')
          .select('qr_code_id')
          .in('id', cycleIds);

        if (qrError) throw qrError;

        const qrCodeIds = cycles?.map((c) => c.qr_code_id) || [];

        if (qrCodeIds.length > 0) {
          const { error: resetError } = await supabase
            .from('qr_codes')
            .update({
              status: 'available',
              last_reset_at: new Date().toISOString(),
            })
            .in('id', qrCodeIds);

          if (resetError) throw resetError;
        }
      }

      // Mark all items as picked up
      const { error: updateItemsError } = await supabase
        .from('driver_pickup_items')
        .update({
          picked_up: true,
          picked_up_at: new Date().toISOString(),
        })
        .eq('pickup_id', pickupId);

      if (updateItemsError) throw updateItemsError;

      // Complete the pickup
      const { data, error } = await supabase
        .from('driver_pickups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

// Delete a pickup
export function useDeletePickup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pickupId: string) => {
      // Get cycle IDs first
      const { data: items, error: itemsError } = await supabase
        .from('driver_pickup_items')
        .select('cycle_id')
        .eq('pickup_id', pickupId);

      if (itemsError) throw itemsError;

      const cycleIds = items?.map((item) => item.cycle_id) || [];

      // Revert cycle statuses to dirty
      if (cycleIds.length > 0) {
        const { error: cyclesError } = await supabase
          .from('cycles')
          .update({
            status: 'dirty',
            pickup_requested_at: null,
          })
          .in('id', cycleIds);

        if (cyclesError) throw cyclesError;
      }

      // Delete items first
      const { error: deleteItemsError } = await supabase
        .from('driver_pickup_items')
        .delete()
        .eq('pickup_id', pickupId);

      if (deleteItemsError) throw deleteItemsError;

      // Delete pickup
      const { error } = await supabase
        .from('driver_pickups')
        .delete()
        .eq('id', pickupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      queryClient.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

// Generate PDF content for a pickup (returns HTML string)
export function generatePickupPDF(pickup: DriverPickup): string {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sl-SI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const items = pickup.items
    .map(
      (item, index) => {
        const strikeStyle = item.pickedUp ? 'text-decoration: line-through; color: #999;' : '';
        return `
      <tr style="${item.pickedUp ? 'background-color: #f0f0f0;' : ''}">
        <td style="padding: 8px; border-bottom: 1px solid #ddd; ${strikeStyle}">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace; ${strikeStyle}">${item.qrCode}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; ${strikeStyle}">${item.matTypeName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; ${strikeStyle}">
          <strong>${item.companyName || '-'}</strong><br/>
          <span style="color: #666;">${item.companyAddress || ''}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; ${strikeStyle}">
          ${item.contactName || '-'}<br/>
          ${item.contactPhone ? `<a href="tel:${item.contactPhone}">${item.contactPhone}</a>` : ''}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
          <input type="checkbox" ${item.pickedUp ? 'checked' : ''} />
        </td>
      </tr>
    `;
      }
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Prevzem #${pickup.id.slice(0, 8)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; margin-bottom: 10px; }
        .info { margin-bottom: 20px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; text-align: left; padding: 10px 8px; border-bottom: 2px solid #ddd; }
        .footer { margin-top: 30px; color: #999; font-size: 12px; }
        @media print {
          body { margin: 10px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Seznam za prevzem</h1>
      <div class="info">
        <p><strong>Datum prevzema:</strong> ${formatDate(pickup.scheduledDate)}</p>
        <p><strong>Šofer:</strong> ${pickup.assignedDriver || 'Ni dodeljen'}</p>
        ${pickup.notes ? `<p><strong>Opombe:</strong> ${pickup.notes}</p>` : ''}
        <p><strong>Število predpražnikov:</strong> ${pickup.items.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>QR koda</th>
            <th>Tip</th>
            <th>Podjetje / Naslov</th>
            <th>Kontakt</th>
            <th>Pobrano</th>
          </tr>
        </thead>
        <tbody>
          ${items}
        </tbody>
      </table>
      <div class="footer">
        <p>Natisnjeno: ${new Date().toLocaleString('sl-SI')}</p>
      </div>
    </body>
    </html>
  `;
}

// Generate Google Maps URL for a pickup
export function generateMapsUrl(pickup: DriverPickup): string | null {
  const addresses = pickup.items
    .filter((item) => item.companyAddress)
    .map((item) => encodeURIComponent(item.companyAddress!));

  if (addresses.length === 0) return null;

  return `https://www.google.com/maps/dir/${addresses.join('/')}`;
}
