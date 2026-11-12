export const swMessages: Record<string, Record<string, string>> = {
  fr: { "nav.sw": "Soins énergétiques", "nav.desc.sw": "Consultation, soin à distance et tarifs : par où commencer." },
  en: { "nav.sw": "Energy healing", "nav.desc.sw": "Consultation, remote healing and prices: where to start." },
  nl: { "nav.sw": "Energetische zorg", "nav.desc.sw": "Consultatie, zorg op afstand en tarieven: waar beginnen." },
};

export function mergeMessages(base: Record<string, Record<string, string>>, extra: Record<string, Record<string, string>>) {
  const out: Record<string, Record<string, string>> = {};
  Object.keys(base).forEach((l) => { out[l] = { ...base[l], ...(extra[l] || {}) }; });
  return out;
}
