/** Crop stage codes of every crop (each crop uses a subset). */
export enum ECropStage {
  SEEDLING = 'SEEDLING',
  TILLERING = 'TILLERING',
  BOOTING = 'BOOTING',
  HEADING = 'HEADING',
  MILK = 'MILK',
  MATURITY = 'MATURITY',
  /** Tree crops: young tree before bearing. */
  YOUNG_TREE = 'YOUNG_TREE',
  FLUSHING = 'FLUSHING',
  FLOWERING = 'FLOWERING',
  FRUIT_SET = 'FRUIT_SET',
  FRUIT_DEVELOPMENT = 'FRUIT_DEVELOPMENT',
  HARVEST = 'HARVEST',
  /** Tree crops: recovery after harvest. */
  TREE_RECOVERY = 'TREE_RECOVERY',
}
