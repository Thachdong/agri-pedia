import { TKnowledgeDiseaseName } from '@modules/knowledge/contracts';

export type TDiseaseNaming = {
  diseaseName: string;
  variantName: string | null;
  category: TKnowledgeDiseaseName['category'] | null;
};

/** Looks up names by diseaseCode / variantCode; unknown codes fall back to the code itself. */
export function namingOf(
  names: TKnowledgeDiseaseName[],
): (diseaseCode: string, variantCode?: string | null) => TDiseaseNaming {
  const byCode = new Map(names.map((name) => [name.code, name]));
  return (diseaseCode, variantCode = null) => {
    const disease = byCode.get(diseaseCode);
    const variant = variantCode ? byCode.get(variantCode) : undefined;
    return {
      diseaseName: disease?.diseaseName ?? variant?.diseaseName ?? diseaseCode,
      variantName: variant?.variantName ?? null,
      category: disease?.category ?? variant?.category ?? null,
    };
  };
}
