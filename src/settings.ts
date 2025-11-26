import { App, PluginSettingTab, Setting } from 'obsidian';
import MistPlugin from './main';

export interface MistSettings {
  blurStrength: number;
  clearAreaRadius: number;
  pathAreaRadius: number;
  fadeSpeed: number;
  isEnabled: boolean;
}

export const DEFAULT_SETTINGS: MistSettings = {
  blurStrength: 10,
  clearAreaRadius: 120,
  pathAreaRadius: 40,
  fadeSpeed: 0.008,
  isEnabled: true
};

export class MistSettingTab extends PluginSettingTab {
  plugin: MistPlugin;

  constructor(app: App, plugin: MistPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Mist - Frosted Glass Effect Settings' });

    // 模糊强度设置
    new Setting(containerEl)
      .setName('Blur Strength')
      .setDesc('Adjust the strength of the frosted glass blur effect')
      .addSlider(slider => slider
        .setLimits(0, 20, 1)
        .setValue(this.plugin.settings.blurStrength)
        .onChange(async (value) => {
          this.plugin.settings.blurStrength = value;
          await this.plugin.saveSettings();
        })
      );

    // 清晰区域半径设置
    new Setting(containerEl)
      .setName('Clear Area Radius')
      .setDesc('Adjust the radius of the clear area when clicking')
      .addSlider(slider => slider
        .setLimits(50, 200, 10)
        .setValue(this.plugin.settings.clearAreaRadius)
        .onChange(async (value) => {
          this.plugin.settings.clearAreaRadius = value;
          await this.plugin.saveSettings();
        })
      );

    // 路径区域半径设置
    new Setting(containerEl)
      .setName('Path Area Radius')
      .setDesc('Adjust the radius of the temporary clear areas along cursor path')
      .addSlider(slider => slider
        .setLimits(20, 80, 5)
        .setValue(this.plugin.settings.pathAreaRadius)
        .onChange(async (value) => {
          this.plugin.settings.pathAreaRadius = value;
          await this.plugin.saveSettings();
        })
      );

    // 淡出速度设置
    new Setting(containerEl)
      .setName('Fade Speed')
      .setDesc('Adjust how quickly clear areas fade back to blur')
      .addSlider(slider => slider
        .setLimits(0.001, 0.02, 0.001)
        .setValue(this.plugin.settings.fadeSpeed)
        .onChange(async (value) => {
          this.plugin.settings.fadeSpeed = value;
          await this.plugin.saveSettings();
        })
      );

    // 启用/禁用开关
    new Setting(containerEl)
      .setName('Enable Mist Effect')
      .setDesc('Toggle the frosted glass effect on or off')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.isEnabled)
        .onChange(async (value) => {
          this.plugin.settings.isEnabled = value;
          await this.plugin.saveSettings();
          // 这里可以添加直接切换效果的逻辑
          if (this.plugin.frostedGlassEffect) {
            this.plugin.frostedGlassEffect.toggleEffect();
          }
        })
      );

    // 添加说明文本
    containerEl.createEl('div', {
      text: 'Use the command palette to toggle the effect or adjust blur strength quickly.',
      cls: 'setting-item-description'
    });
  }
}