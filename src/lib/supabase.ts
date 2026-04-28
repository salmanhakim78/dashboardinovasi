import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface InovasiDaerah {
  no: number;
  judul_inovasi: string;
  pemda: string;
  admin_opd: string;
  inisiator: string;
  nama_inisiator: string;
  bentuk_inovasi: string;
  jenis: string;
  asta_cipta: string;
  urusan_utama: string;
  urusan_lain_yang_beririsan: string;
  kematangan: number;      
  tahapan_inovasi: string;
  tanggal_input: string;   
  tanggal_penerapan: string;
  tanggal_pengembangan: string;
  video: string;
  link_video: string;
  label_kematangan: string;
  lat: number;             
  lon: number;
  deskripsi: string;           
}