import { supabase } from '@/lib/supabase';

// Couche d'accès données — remplace base44.entities.*
// API volontairement proche de l'ancienne (list/filter/create/update/remove)
// pour rendre le portage mécanique. `table` = nom de table Supabase.

function makeRepo(table) {
  return {
    async list(orderBy = 'created_at', ascending = false, limit) {
      let q = supabase.from(table).select('*').order(orderBy, { ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    async filter(match, orderBy = 'created_at', ascending = false) {
      const { data, error } = await supabase.from(table).select('*').match(match).order(orderBy, { ascending });
      if (error) throw error;
      return data;
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    async createMany(rows) {
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) throw error;
      return data;
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const Bookings = makeRepo('bookings');
export const Clients = makeRepo('clients');
export const Employees = makeRepo('employees');
export const EmployeeDocuments = makeRepo('employee_documents');
export const Candidatures = makeRepo('candidatures');
export const Invoices = makeRepo('invoices');
export const Leads = makeRepo('leads');

// Table à clé primaire client_id (pas de colonne id ni created_at)
export const UrssafDetails = {
  async getByClientId(clientId) {
    const { data, error } = await supabase
      .from('client_urssaf_details').select('*').eq('client_id', clientId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async filter(match) {
    const { data, error } = await supabase.from('client_urssaf_details').select('*').match(match);
    if (error) throw error;
    return data;
  },
  async upsert(values) {
    const { data, error } = await supabase
      .from('client_urssaf_details').upsert(values).select().single();
    if (error) throw error;
    return data;
  },
};

// Vue publique restreinte des employées (id, first_name, photo_url) — lisible par les clients
export const PublicEmployees = {
  async list() {
    const { data, error } = await supabase.from('employees_public').select('*');
    if (error) throw error;
    return data;
  },
};
