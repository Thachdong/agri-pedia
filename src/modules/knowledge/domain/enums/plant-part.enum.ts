/** Plant part codes of every crop (each crop uses a subset), shared with the KB `affectedPart.codes`. */
export enum EPlantPart {
  LEAF = 'LEAF',
  SHEATH = 'SHEATH',
  STEM = 'STEM',
  PANICLE = 'PANICLE',
  ROOT = 'ROOT',
  WHOLE_PLANT = 'WHOLE_PLANT',
  /** Young shoot / new leaves. */
  SHOOT = 'SHOOT',
  BRANCH = 'BRANCH',
  /** Trunk of a tree (STEM stays for herbaceous crops). */
  TRUNK = 'TRUNK',
  /** Trunk base / root collar. */
  COLLAR = 'COLLAR',
  FLOWER = 'FLOWER',
  FRUIT = 'FRUIT',
  /** Aril / flesh of an opened fruit. */
  ARIL = 'ARIL',
}
