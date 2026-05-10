import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export function useAircraft() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["aircraft", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase.from("aircraft").select("*").order("prefix");
       if (error) throw error;
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
   });
 }
 
 export function useShipments() {
   const { user } = useAuth();
   return useQuery({
     queryKey: ["shipments", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("part_shipments")
         .select("*, aircraft:aircraft_id(prefix, model)")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data || [];
     },
     staleTime: 2 * 60 * 1000,
   });
 }

export function useServices() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["services", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("services")
         .select("*, aircraft:aircraft_id(prefix, model)")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data || [];
     },
     staleTime: 2 * 60 * 1000,
  });
}

export function useParts() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["parts", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("parts")
         .select("*, aircraft:aircraft_id(prefix)")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data || [];
     },
     staleTime: 5 * 60 * 1000,
  });
}

export function useDocuments() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["documents", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
       if (error) throw error;
       return data || [];
     },
     staleTime: 5 * 60 * 1000,
  });
}

export function useMaintenanceItems() {
  const { user } = useAuth();
  return useQuery({
     queryKey: ["maintenance_items", user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("maintenance_items")
         .select("*, aircraft:aircraft_id(prefix, model)")
         .order("due_date", { ascending: true, nullsFirst: false });
       if (error) throw error;
       return data || [];
     },
     staleTime: 2 * 60 * 1000,
  });
}