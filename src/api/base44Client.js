import { supabase } from '@/lib/supabaseClient';

const noopFunctionResult = { data: {} };

const clientColumnMap = {
  civility: 'civility',
  civilite: 'civility',
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  email: 'email',
  address: 'address',
  zipcode: 'cp',
  cp: 'cp',
  city: 'city',
  additional_address: 'complement',
  complement: 'complement',
  has_animals: 'has_pets',
  has_pets: 'has_pets',
  avance_immediate: 'avance_immediate',
  urssaf_status: 'urssaf_status',
  role: 'role',
  iban: 'iban',
  bic: 'bic',
  account_holder: 'account_holder',
  active: 'active',
  urssaf_payload: 'urssaf_payload',
  stripe_payment_method_id: 'stripe_payment_method_id',
  stripe_customer_id: 'stripe_customer_id',
  idAbby: 'idabby',
  idabby: 'idabby',
};

const reservationColumnMap = {
  ref: 'ref',
  client_id: 'client_id',
  employee_id: 'employee_id',
  service_type: 'service_id',
  service_id: 'service_id',
  service_label: 'service_label',
  duration: 'duration',
  date: 'date',
  time: 'date',
  address: 'address',
  zipcode: 'cp',
  cp: 'cp',
  city: 'city',
  additional_address: 'complement',
  complement: 'complement',
  has_animals: 'has_pets',
  has_pets: 'has_pets',
  advance_immediate: 'avance_immediate',
  avance_immediate: 'avance_immediate',
  instructions: 'instructions',
  has_cleaning_supplies: 'has_equipment',
  has_equipment: 'has_equipment',
  status: 'status',
  total_price: 'price_ht',
  billing_status: 'payment_status',
  invoice_id: 'invoice_id',
};

const employeeColumnMap = {
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  hourly_rate: 'hourly_rate',
  status: 'active',
  active: 'active',
  documents: 'documents',
  color: 'color',
};

const invoiceColumnMap = {
  reservation_id: 'reservation_id',
  client_id: 'client_id',
  amount: 'amount',
  pdf_url: 'pdf_url',
};

const candidatureColumnMap = {
  email: 'email',
  civilite: 'civilite',
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  address: 'address',
  zipcode: 'zipcode',
  city: 'city',
  permis_sejour: 'permis_sejour',
  heures_semaine: 'heures_semaine',
  annees_experience: 'annees_experience',
  lieux_experience: 'lieux_experience',
  vehicule: 'vehicule',
  cv_url: 'cv_url',
  status: 'status',
};

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function invokeSupabaseFunction(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { data };
}

function normalizeClient(row = {}) {
  const payload = row.urssaf_payload || {};
  return {
    ...row,
    civilite: row.civility || '',
    zipcode: row.cp || '',
    has_animals: !!row.has_pets,
    urssaf_completed: row.urssaf_status === 'complet' || row.urssaf_status === 'ai_demandee' || row.urssaf_status === 'ai_acceptee',
    status: row.active === false ? 'inactive' : 'active',
    nom_naissance: payload.birthName || row.nom_naissance || '',
    birthdate: payload.birthDate || row.birthdate || '',
    pays_naissance: payload.birthCountry || row.pays_naissance || 'France',
    zipcode_naissance: payload.birthZipcode || row.zipcode_naissance || '',
    numero_voie: payload.streetNumber || row.numero_voie || '',
    lettre_voie: payload.streetLetter || row.lettre_voie || '',
    type_voie: payload.streetType || row.type_voie || '',
    nom_voie: payload.streetName || row.nom_voie || '',
    lieu_dit: payload.locality || row.lieu_dit || '',
    complement_adresse: payload.addressExtra || row.complement_adresse || row.complement || '',
    pays: payload.country || row.pays || 'France',
  };
}

function mapUrssafStatusForUi(status) {
  switch (status) {
    case 'complet':
      return 'completed';
    case 'ai_demandee':
      return 'ai_requested';
    case 'ai_acceptee':
      return 'ai_accepted';
    case 'en_cours':
      return 'pending';
    default:
      return 'none';
  }
}

function mapPaymentStatusToBilling(status) {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'refunded':
      return 'generated';
    default:
      return 'none';
  }
}

function normalizeReservation(row = {}) {
  const dateValue = row.date ? new Date(row.date) : null;
  const hour = dateValue ? dateValue.getHours() : null;
  const minutes = dateValue ? dateValue.getMinutes() : 0;
  const time = hour === null ? '' : `${hour}${minutes === 30 ? 'h30' : 'h'}`;
  return {
    ...row,
    service_type: row.service_id,
    zipcode: row.cp || '',
    additional_address: row.complement || '',
    advance_immediate: !!row.avance_immediate,
    has_animals: !!row.has_pets,
    has_cleaning_supplies: !!row.has_equipment,
    total_price: Number(row.price_ht || 0),
    billing_status: mapPaymentStatusToBilling(row.payment_status),
    urssaf_status: mapUrssafStatusForUi(row.urssaf_status),
    duration: String(row.duration).includes('h') ? row.duration : `${Number(row.duration || 0).toString().replace('.5', 'h30').replace('.0', '')}${String(row.duration).includes('h') ? '' : 'h'}`,
    time,
    contact_details: row.contact_details || {
      first_name: row.client?.first_name || '',
      last_name: row.client?.last_name || '',
      email: row.client?.email || '',
      phone: row.client?.phone || '',
    },
    created_date: row.created_at,
  };
}

function normalizeEmployee(row = {}) {
  return {
    ...row,
    status: row.active === false ? 'inactive' : 'active',
    joined_date: row.created_at,
  };
}

function normalizeInvoice(row = {}) {
  return {
    ...row,
    created_date: row.issued_at,
    invoice_file_url: row.pdf_url,
  };
}

function normalizeCandidature(row = {}) {
  return {
    ...row,
    created_date: row.created_at,
    lieux_experience: Array.isArray(row.lieux_experience) ? row.lieux_experience : [],
    status: row.status || 'pending',
  };
}

function mapClientForDb(input = {}) {
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = clientColumnMap[key];
    if (mappedKey) output[mappedKey] = value;
  });
  return output;
}

function mapEmployeeForDb(input = {}) {
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = employeeColumnMap[key];
    if (mappedKey) output[mappedKey] = value;
  });
  if ('status' in input && !('active' in output)) {
    output.active = input.status === 'active';
  }
  return output;
}

function formatBookingDate(date, time) {
  if (!date) return null;
  if (!time) return date;
  const hour = Number(String(time).split('h')[0] || 0);
  const minutes = String(time).includes('30') ? 30 : 0;
  const datePart = new Date(date);
  datePart.setHours(hour, minutes, 0, 0);
  return datePart.toISOString();
}

function servicePricing(serviceId) {
  switch (serviceId) {
    case 'one_time':
    case 'ponctuel':
      return { priceHT: 29, priceNet: 14.5 };
    case 'spring':
    case 'printemps':
      return { priceHT: 32, priceNet: 16 };
    default:
      return { priceHT: 26, priceNet: 13 };
  }
}

function mapBookingForDb(input = {}) {
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = reservationColumnMap[key];
    if (mappedKey && mappedKey !== 'date') output[mappedKey] = value;
  });

  const serviceId = input.service_type || input.service_id || 'regular';
  const numericDuration = typeof input.duration === 'string'
    ? Number(input.duration.replace('h30', '.5').replace('h', ''))
    : Number(input.duration || 0);
  const pricing = servicePricing(serviceId);
  const totalPrice = Number(input.total_price || pricing.priceHT * numericDuration || 0);

  output.ref = input.ref || output.ref || `NK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  output.service_id = serviceId;
  output.service_label = input.service_label || input.service_type || serviceId;
  output.duration = numericDuration;
  output.price_ht = totalPrice;
  output.price_net = Number(input.price_net || pricing.priceNet * numericDuration || 0);
  output.date = formatBookingDate(input.date, input.time) || input.date || null;
  output.avance_immediate = input.advance_immediate ?? input.avance_immediate ?? false;
  output.has_pets = input.has_animals ?? input.has_pets ?? false;
  output.has_equipment = input.has_cleaning_supplies ?? input.has_equipment ?? false;
  output.payment_status = input.billing_status === 'paid' ? 'paid' : 'unpaid';
  output.urssaf_status = input.urssaf_status || null;
  return output;
}

function mapInvoiceForDb(input = {}) {
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = invoiceColumnMap[key];
    if (mappedKey) output[mappedKey] = value;
  });
  return output;
}

function mapCandidatureForDb(input = {}) {
  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    const mappedKey = candidatureColumnMap[key];
    if (mappedKey) output[mappedKey] = value;
  });
  return output;
}

function applyOrder(query, orderValue) {
  if (!orderValue) return query;
  const descending = String(orderValue).startsWith('-');
  const rawColumn = descending ? String(orderValue).slice(1) : String(orderValue);
  const column =
    clientColumnMap[rawColumn] ||
    reservationColumnMap[rawColumn] ||
    employeeColumnMap[rawColumn] ||
    invoiceColumnMap[rawColumn] ||
    rawColumn
      .replace('created_date', 'created_at')
      .replace('joined_date', 'created_at');
  return query.order(column, { ascending: !descending });
}

function applyFilters(query, filters = {}, map = {}) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    const column = map[key] || key;
    query.eq(column, value);
  });
  return query;
}

async function getCurrentProfile() {
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) return null;

  let { data: profile, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    const fallbackPayload = {
      id: authUser.id,
      email: authUser.email,
      first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.firstName || null,
      last_name: authUser.user_metadata?.last_name || authUser.user_metadata?.lastName || null,
      phone: authUser.user_metadata?.phone || null,
      role: 'client',
      active: true,
    };

    const { data: insertedProfile, error: insertError } = await supabase
      .from('clients')
      .upsert(fallbackPayload)
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    profile = insertedProfile;
  }

  return normalizeClient({
    id: authUser.id,
    email: authUser.email,
    ...profile,
  });
}

async function selectMany(table, filters = {}, options = {}, map = {}, normalizer = (row) => row) {
  const selectClause =
    table === 'reservations'
      ? '*, client:clients!reservations_client_id_fkey(*)'
      : '*';
  let query = supabase.from(table).select(selectClause);
  query = applyFilters(query, filters, map);
  query = applyOrder(query, options.order);
  if (options.limit) query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizer);
}

async function selectOne(table, id, normalizer = (row) => row) {
  const selectClause =
    table === 'reservations'
      ? '*, client:clients!reservations_client_id_fkey(*)'
      : '*';
  const { data, error } = await supabase.from(table).select(selectClause).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizer(data) : null;
}

export const base44 = {
  auth: {
    async me() {
      const profile = await getCurrentProfile();
      if (!profile) throw new Error('Not authenticated');
      return profile;
    },
    logout(redirectTo) {
      supabase.auth.signOut();
      localStorage.removeItem('clientId');
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    },
    redirectToLogin(redirectTo) {
      const target = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
      window.location.href = `/connexion${target}`;
    },
  },
  functions: {
    async invoke(name, payload = {}) {
      if (name === 'forgotPassword') {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(payload.email, { redirectTo });
        if (error) throw error;
        return noopFunctionResult;
      }

      if (name === 'getStripePublishableKey') {
        const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
        if (envKey) {
          return { data: { key: envKey } };
        }
        return invokeSupabaseFunction('get-stripe-publishable-key', payload);
      }

      if (name === 'createStripeSetupIntent') {
        return invokeSupabaseFunction('create-stripe-setup-intent', payload);
      }

      if (name === 'chargeClient') {
        return invokeSupabaseFunction('charge-client', payload);
      }

      if (name === 'sendBookingNotification' || name === 'sendUrssafWebhook' || name === 'sendEnterpriseRequest') {
        return noopFunctionResult;
      }

      throw new Error(`Function ${name} is not connected yet in Supabase.`);
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) {
          throw new Error('Missing file');
        }

        const extension = file.name?.includes('.') ? file.name.split('.').pop() : 'bin';
        const fileName = `${Date.now()}-${uuid()}.${extension}`;
        const filePath = `uploads/${fileName}`;

        const { error } = await supabase.storage
          .from('partner-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data } = supabase.storage.from('partner-files').getPublicUrl(filePath);
        return { file_url: data.publicUrl };
      },
    },
  },
  entities: {
    Client: {
      async list(order, limit = 200) {
        return selectMany('clients', {}, { order, limit }, clientColumnMap, normalizeClient);
      },
      async filter(filters = {}) {
        return selectMany('clients', filters, {}, clientColumnMap, normalizeClient);
      },
      async create(data = {}) {
        const password = data.password || Math.random().toString(36).slice(2) + 'Aa1!';
        const email = data.email?.trim().toLowerCase();
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: data.first_name || null,
              last_name: data.last_name || null,
              phone: data.phone || null,
            },
          },
        });
        if (signUpError) throw signUpError;
        const userId = authData.user?.id;
        if (!userId) throw new Error('Impossible de créer le compte Supabase.');
        const payload = {
          id: userId,
          email,
          role: data.role || 'client',
          active: data.status !== 'inactive',
          ...mapClientForDb(data),
        };
        const { error } = await supabase.from('clients').upsert(payload);
        if (error) throw error;
        const created = await selectOne('clients', userId, normalizeClient);
        return created;
      },
      async update(id, data = {}) {
        const payload = mapClientForDb(data);
        if ('status' in data && !('active' in payload)) {
          payload.active = data.status === 'active';
        }
        const { error } = await supabase.from('clients').update(payload).eq('id', id);
        if (error) throw error;
        return selectOne('clients', id, normalizeClient);
      },
      async delete(id) {
        const { error } = await supabase.from('clients').update({ active: false }).eq('id', id);
        if (error) throw error;
        return true;
      },
    },
    Booking: {
      async list(order, limit = 200) {
        return selectMany('reservations', {}, { order, limit }, reservationColumnMap, normalizeReservation);
      },
      async filter(filters = {}) {
        return selectMany('reservations', filters, {}, reservationColumnMap, normalizeReservation);
      },
      async create(data = {}) {
        const payload = mapBookingForDb(data);
        const { data: inserted, error } = await supabase.from('reservations').insert(payload).select('*').single();
        if (error) throw error;
        return normalizeReservation(inserted);
      },
      async update(id, data = {}) {
        const payload = mapBookingForDb(data);
        const { error } = await supabase.from('reservations').update(payload).eq('id', id);
        if (error) throw error;
        return selectOne('reservations', id, normalizeReservation);
      },
      async delete(id) {
        const { error } = await supabase.from('reservations').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
    },
    Employee: {
      async list(order, limit = 200) {
        return selectMany('employees', {}, { order, limit }, employeeColumnMap, normalizeEmployee);
      },
      async filter(filters = {}) {
        return selectMany('employees', filters, {}, employeeColumnMap, normalizeEmployee);
      },
      async create(data = {}) {
        const payload = {
          id: data.id || uuid(),
          ...mapEmployeeForDb(data),
        };
        const { data: inserted, error } = await supabase.from('employees').insert(payload).select('*').single();
        if (error) throw error;
        return normalizeEmployee(inserted);
      },
      async update(id, data = {}) {
        const payload = mapEmployeeForDb(data);
        const { error } = await supabase.from('employees').update(payload).eq('id', id);
        if (error) throw error;
        return selectOne('employees', id, normalizeEmployee);
      },
      async delete(id) {
        const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
        if (error) throw error;
        return true;
      },
    },
    Invoice: {
      async list(order, limit = 200) {
        return selectMany('invoices', {}, { order, limit }, invoiceColumnMap, normalizeInvoice);
      },
      async filter(filters = {}) {
        return selectMany('invoices', filters, {}, invoiceColumnMap, normalizeInvoice);
      },
      async create(data = {}) {
        const payload = mapInvoiceForDb(data);
        const { data: inserted, error } = await supabase.from('invoices').insert(payload).select('*').single();
        if (error) throw error;
        return normalizeInvoice(inserted);
      },
      async update(id, data = {}) {
        const payload = mapInvoiceForDb(data);
        const { error } = await supabase.from('invoices').update(payload).eq('id', id);
        if (error) throw error;
        return selectOne('invoices', id, normalizeInvoice);
      },
      async delete(id) {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
    },
    Candidature: {
      async list(order, limit = 200) {
        return selectMany('candidatures', {}, { order, limit }, candidatureColumnMap, normalizeCandidature);
      },
      async filter(filters = {}) {
        return selectMany('candidatures', filters, {}, candidatureColumnMap, normalizeCandidature);
      },
      async create(data = {}) {
        const payload = mapCandidatureForDb(data);
        const { data: inserted, error } = await supabase
          .from('candidatures')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        return normalizeCandidature(inserted);
      },
      async update(id, data = {}) {
        const payload = mapCandidatureForDb(data);
        const { error } = await supabase.from('candidatures').update(payload).eq('id', id);
        if (error) throw error;
        return selectOne('candidatures', id, normalizeCandidature);
      },
      async delete(id) {
        const { error } = await supabase.from('candidatures').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
    },
  },
};
