/** The permanent import door key for settings, lineage and history. A fixed value:
 * the owner-claim installation id comes only from configuration, is empty on a
 * self-hosted install and may be assigned later, which would orphan history. */
export const IMPORT_DOOR_KEY = 'oncall'
