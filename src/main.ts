import { Plugin } from 'obsidian';
import { FrostedGlassEffect } from './FrostedGlassEffect';
import { MistSettings, DEFAULT_SETTINGS } from './settings';
import { MistSettingTab } from './settings';

export default class MistPlugin extends Plugin {
  settings: MistSettings = DEFAULT_SETTINGS;
  frostedGlassEffect: FrostedGlassEffect;

  async onload() {
    await this.loadSettings();

    // 初始化磨砂玻璃效果
    this.frostedGlassEffect = new FrostedGlassEffect(this);

    // 添加设置选项卡
    this.addSettingTab(new MistSettingTab(this.app, this));

    // 添加命令
    this.addCommand({
      id: 'mist-toggle-effect',
      name: 'Toggle Frosted Glass Effect',
      callback: () => {
        this.frostedGlassEffect.toggleEffect();
      }
    });

    // 添加命令面板选项
    this.addCommand({
      id: 'mist-adjust-blur',
      name: 'Adjust Blur Strength',
      callback: () => {
        // 这里可以添加调整模糊强度的逻辑
        this.frostedGlassEffect.adjustBlurStrength(5);
      }
    });

    console.log('Mist Plugin loaded!');
  }

  async onunload() {
    // 清理资源
    this.frostedGlassEffect.cleanup();
    console.log('Mist Plugin unloaded!');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // 更新效果设置
    this.frostedGlassEffect.updateSettings(this.settings);
  }
}