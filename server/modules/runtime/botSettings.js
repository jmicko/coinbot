import { databaseClient } from '../databaseClient.js';

const botSettings = new class BotSettings {
  constructor() {
    this.loop_speed = Number();
    this.orders_to_sync = Number();
    this.full_sync = Number(1);
    this.maintenance = Boolean(true);
    this.registration_open = Boolean(true);
  }

  async refresh() {
    const newBotSettings = await databaseClient.getBotSettings();
    Object.assign(this, newBotSettings);
  }

  change(settings) {
    Object.assign(this, settings);
  }

  get() {
    return structuredClone(this);
  }
};

export { botSettings };
