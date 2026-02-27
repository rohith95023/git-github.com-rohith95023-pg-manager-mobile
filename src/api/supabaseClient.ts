// Modified for React Native migration
// Redirect to the centralized native client
import { supabase as nativeSupabase } from "../lib/supabaseClient.native";

export const supabase = nativeSupabase;

