/** Provider codes accepted by Perfios Hub (hub.perfios.ai docs, Sept 2026). */
export const ELECTRICITY_BOARDS: [code: string, name: string][] = [
  ["ADANI_MUMBAI", "Adani Electricity Mumbai"], ["AJMER", "Ajmer Vidyut Vitran Nigam"], ["APCPDCL", "AP Central Power (APCPDCL)"],
  ["APDCL", "Assam Power (APDCL)"], ["APEPDCL", "AP Eastern Power (APEPDCL)"], ["APSPDCL", "AP Southern Power (APSPDCL)"],
  ["BSES_DL", "BSES Yamuna / Rajdhani (Delhi)"], ["BESCOM", "BESCOM (Bengaluru)"], ["BEST_MH", "BEST (Mumbai)"],
  ["CESC", "CESC (Kolkata)"], ["CESCOM", "CESCOM (Mysuru)"], ["CH_ELEC", "Chandigarh Electricity"], ["CSPDCL", "Chhattisgarh (CSPDCL)"],
  ["DGVCL", "Dakshin Gujarat (DGVCL)"], ["DHBVN", "Dakshin Haryana (DHBVN)"], ["DAMAN_DIU", "Daman & Diu Electricity"],
  ["NAGALAND", "Nagaland Power"], ["GOA_ELEC", "Goa (Tiswadi, Ponda, Verna)"], ["UPAY_GOA", "Goa (others)"],
  ["MIZORAM", "Mizoram Power"], ["GESCOM", "GESCOM (Kalaburagi)"], ["HPSEB", "Himachal (HPSEB)"], ["HESCOM", "HESCOM (Hubballi)"],
  ["HUKKERI", "Hukkeri RECS"], ["JAIPUR", "Jaipur Vidyut Vitran Nigam"], ["JAMMU", "Jammu Power"], ["JBVNL", "Jharkhand (JBVNL)"],
  ["JODHPUR", "Jodhpur Vidyut Vitran Nigam"], ["KESCO", "KESCO (Kanpur)"], ["KERALA", "Kerala (KSEB)"], ["MAHAVITRAN", "Maharashtra (MSEDCL / Mahavitaran)"],
  ["MGVCL", "Madhya Gujarat (MGVCL)"], ["MPCZ", "MP Madhya Kshetra"], ["MPWZ", "MP Paschim Kshetra"], ["MPEZ", "MP Poorv Kshetra"],
  ["MESCOM", "MESCOM (Mangaluru)"], ["MANIPUR", "Manipur Power"], ["MeECL", "Meghalaya (MeECL)"], ["NBPDCL", "North Bihar (NBPDCL)"],
  ["PGVCL", "Paschim Gujarat (PGVCL)"], ["PSPCL", "Punjab (PSPCL)"], ["SBPDCL", "South Bihar (SBPDCL)"], ["ORISSA", "Odisha (SOUTHCO etc.)"],
  ["TATA_MUMBAI", "Tata Power Mumbai"], ["ORISSA_CENTRAL", "TP Central Odisha"], ["ORISSA_NORTH", "TP Northern Odisha"],
  ["ORISSA_SOUTHERN", "TP Southern Odisha"], ["ORISSA_WESTERN", "TP Western Odisha"], ["CHENNAI_NORTH", "TANGEDCO Chennai North"],
  ["CHENNAI_SOUTH", "TANGEDCO Chennai South"], ["COIMBATORE", "TANGEDCO Coimbatore"], ["ERODE", "TANGEDCO Erode"], ["MADURAI", "TANGEDCO Madurai"],
  ["TIRUNELVEL", "TANGEDCO Tirunelveli"], ["TRICHY", "TANGEDCO Trichy"], ["VELLORE", "TANGEDCO Vellore"], ["VILLUPURAM", "TANGEDCO Villupuram"],
  ["TATA_DL", "Tata Power Delhi"], ["UTL_INFRA", "Tata Steel UISL (Jamshedpur)"], ["TGNPDCL", "Telangana Northern (TGNPDCL)"],
  ["TSSPCL", "Telangana Southern (TGSPDCL)"], ["TORRENT_AGRA", "Torrent Power Agra"], ["TORRENT_AHD", "Torrent Power Ahmedabad"],
  ["TORRENT_BHIWANDI", "Torrent Power Bhiwandi"], ["TORRENT_DAHEJ", "Torrent Power Dahej"], ["TORRENT_SURAT", "Torrent Power Surat"],
  ["TRIPURA", "Tripura (TSECL)"], ["UPPCL", "Uttar Pradesh (UPPCL, all zones)"], ["UGVCL", "Uttar Gujarat (UGVCL)"],
  ["UHBVN", "Uttar Haryana (UHBVN)"], ["WBENGAL", "West Bengal (WBSEDCL)"],
];
export const NEEDS_DISTRICT = new Set(["JBVNL", "UPPCL", "MANIPUR"]);

export const GAS_PROVIDERS: [code: string, name: string, needs: "consumer" | "bp" | "both"][] = [
  ["AG", "Adani Total Gas", "consumer"], ["IG", "Indraprastha Gas (IGL)", "bp"], ["MG", "Mahanagar Gas (MGL)", "both"],
  ["GAIL", "GAIL Gas", "consumer"], ["GJ", "Gujarat Gas", "consumer"],
];
