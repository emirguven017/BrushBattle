/** İlk kurulumda dil seçimi tamamlandı (sihirbazdan önce) */
export const FIRST_RUN_LANGUAGE_DONE_KEY = '@brush_battle_first_launch_language_v1';
export const firstRunLanguageAccountDoneKey = (userId: string) =>
  `@brush_battle_first_launch_language_account_v1_${userId}`;

/** Cihazda bir kez gösterilen karşılama sihirbazı (çıkışlı akış) */
export const WELCOME_WIZARD_DONE_KEY = '@brush_battle_welcome_wizard_v1_done';
export const WELCOME_WIZARD_DATA_KEY = '@brush_battle_welcome_wizard_v1_data';

/** Giriş yapmış, onboarding bitmemiş kullanıcı için sihirbaz tamamlandı bayrağı */
export const welcomeWizardAccountDoneKey = (userId: string) =>
  `@brush_battle_welcome_wizard_account_v1_${userId}`;

export const WELCOME_WIZARD_STEP_COUNT = 12;
