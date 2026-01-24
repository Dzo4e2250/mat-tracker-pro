# Validation Module

Modul za validacijo podatkov z Zod knjižnico.

## Uporaba

### 1. Validacija forme pred pošiljanjem

```typescript
import { createCompanyInputSchema } from '@/lib/validation';

function handleSubmit(formData: unknown) {
  const result = createCompanyInputSchema.safeParse(formData);

  if (!result.success) {
    // Prikaži napake uporabniku
    const errors = result.error.flatten().fieldErrors;
    // { name: ['Polje je obvezno'], tax_number: ['Neveljavna davčna številka'] }
    return;
  }

  // Varni podatki - lahko pošlješ na API
  const validData = result.data;
  createCompany.mutate(validData);
}
```

### 2. Validacija API odgovora

```typescript
import { companiesArraySchema, safeValidate } from '@/lib/validation';

const { data } = await supabase.from('companies').select('*');
const companies = safeValidate(companiesArraySchema, data, 'companies query');

if (!companies) {
  // Podatki niso veljavni - logiranje v dev načinu
  return [];
}
```

### 3. Validacija z React Hook Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { createContactInputSchema } from '@/lib/validation';

const form = useForm({
  resolver: zodResolver(createContactInputSchema),
  defaultValues: {
    first_name: '',
    phone: '',
    email: '',
  }
});
```

## Dostopne sheme

### Vhodne sheme (forme, mutacije)
- `createCompanyInputSchema` - ustvarjanje podjetja
- `createContactInputSchema` - ustvarjanje kontakta
- `createCycleInputSchema` - ustvarjanje cikla
- `createPickupInputSchema` - ustvarjanje prevzema
- `createContractInputSchema` - ustvarjanje pogodbe
- `createReminderInputSchema` - ustvarjanje opomnika
- `loginInputSchema` - prijava

### API sheme (validacija odgovorov)
- `companySchema`, `companiesArraySchema`
- `contactSchema`, `contactsArraySchema`
- `cycleSchema`, `cyclesArraySchema`
- `profileSchema`, `profilesArraySchema`
- `driverPickupSchema`
- `contractSchema`

## Utility funkcije

- `safeValidate(schema, data)` - vrne podatke ali null
- `validateArray(schema, data)` - filtrira neveljavne elemente
- `strictValidate(schema, data)` - vrže napako če ne uspe
- `validateSupabaseResponse(schema, response)` - za Supabase queries
