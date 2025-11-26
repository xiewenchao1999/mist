import MistPlugin from './main';
import { MistSettings } from './settings';

// 添加自定义属性类型声明
declare global {
  interface HTMLElement {
    _clearArea?: any;
  }
}

export class FrostedGlassEffect {
  private plugin: MistPlugin;
  private container: HTMLElement;
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private clearAreas: Array<any>;
  private cursorPathAreas: Array<any>;
  private isAnimating: boolean;
  private lastCursorPos: { x: number; y: number } | null;
  private isEnabled: boolean;
  private blurStrength: number;

  constructor(plugin: MistPlugin) {
    this.plugin = plugin;
    this.isEnabled = true;
    this.blurStrength = plugin.settings.blurStrength;
    this.clearAreas = [];
    this.cursorPathAreas = [];
    this.isAnimating = false;
    this.lastCursorPos = null;

    this.init();
  }

  private init() {
    this.setupDOM();
    this.setupEventListeners();
    this.startAnimation();
  }

  private setupDOM() {
    // 获取或创建容器
    this.container = document.body;

    // 创建磨砂玻璃覆盖层
    this.overlay = document.createElement('div');
    this.overlay.className = 'mist-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '100';
    this.overlay.style.backdropFilter = `blur(${this.blurStrength}px)`;
    this.overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    this.overlay.style.maskImage = 'url(data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="black"/></svg>)';
    this.overlay.style.maskSize = 'cover';
    this.overlay.style.maskPosition = 'center';
    this.overlay.style.maskRepeat = 'no-repeat';
    this.overlay.style.transition = 'mask-image 0.3s ease';

    // 创建Canvas用于生成遮罩
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mist-mask-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '0';
    this.canvas.style.zIndex = '101';

    // 设置Canvas尺寸
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d')!;

    // 添加到DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.canvas);
  }

  private setupEventListeners() {
    // 窗口调整事件
    window.addEventListener('resize', () => this.resizeCanvas());

    // 点击事件
    this.container.addEventListener('click', (e) => this.handleClick(e));

    // 输入事件监听
    this.setupInputEventListeners();
  }

  private setupInputEventListeners() {
    // 监听所有输入元素
    const inputElements = document.querySelectorAll('input, textarea, [contenteditable="true"]');
    inputElements.forEach(input => {
      input.addEventListener('focus', (e) => this.handleInputFocus(e as FocusEvent));
      input.addEventListener('blur', (e) => this.handleInputBlur(e as FocusEvent));
    });

    // 监听动态添加的输入元素
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              const inputs = node.querySelectorAll('input, textarea, [contenteditable="true"]');
              inputs.forEach(input => {
                input.addEventListener('focus', (e) => this.handleInputFocus(e as FocusEvent));
                input.addEventListener('blur', (e) => this.handleInputBlur(e as FocusEvent));
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private handleClick(e: MouseEvent) {
    // 检查点击目标是否为输入元素
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)) {
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    this.createClearArea(x, y);
  }

  private handleInputFocus(e: FocusEvent) {
    const target = e.target as HTMLElement;
    const cursorPos = this.getCursorPosition(target);
    
    // 创建输入焦点的清晰区域
    const clearArea = {
      x: cursorPos.x,
      y: cursorPos.y,
      radius: 0,
      maxRadius: 60,
      opacity: 1,
      expandingSpeed: 3,
      expanding: true,
      isInputFocus: true,
      target: target,
      createdTime: Date.now()
    };

    target['_clearArea'] = clearArea;
    this.clearAreas.push(clearArea);

    // 添加光标移动监听
    this.addCursorMoveListeners(target);
  }

  private handleInputBlur(e: FocusEvent) {
    const target = e.target as HTMLElement;
    if (target['_clearArea']) {
      target['_clearArea'].isInputFocus = false;
      target['_clearArea'].fading = true;
      target['_clearArea'].fadeSpeed = 0.02;
      delete target['_clearArea'];
    }

    // 移除光标移动监听
    this.removeCursorMoveListeners(target);
  }

  private addCursorMoveListeners(element: HTMLElement) {
    element.addEventListener('input', (e) => this.updateClearAreaPosition(e.target as HTMLElement));
    element.addEventListener('keydown', (e) => {
      setTimeout(() => this.updateClearAreaPosition(e.target as HTMLElement), 0);
    });
    element.addEventListener('click', (e) => this.updateClearAreaPosition(e.target as HTMLElement));
  }

  private removeCursorMoveListeners(element: HTMLElement) {
    element.removeEventListener('input', (e) => this.updateClearAreaPosition(e.target as HTMLElement));
    element.removeEventListener('keydown', (e) => {
      setTimeout(() => this.updateClearAreaPosition(e.target as HTMLElement), 0);
    });
    element.removeEventListener('click', (e) => this.updateClearAreaPosition(e.target as HTMLElement));
  }

  private updateClearAreaPosition(element: HTMLElement) {
    if (!element['_clearArea']) return;

    const cursorPos = this.getCursorPosition(element);
    const currentX = cursorPos.x;
    const currentY = cursorPos.y;

    // 更新主清晰区域位置
    const clearArea = element['_clearArea'];
    clearArea.x = currentX;
    clearArea.y = currentY;

    // 处理光标移动路径效果
    if (this.lastCursorPos) {
      const lastX = this.lastCursorPos.x;
      const lastY = this.lastCursorPos.y;
      
      const distance = Math.sqrt(Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2));
      
      if (distance > 5) {
        this.generateCursorPathAreas(lastX, lastY, currentX, currentY);
      }
    }

    this.lastCursorPos = { x: currentX, y: currentY };
  }

  private generateCursorPathAreas(startX: number, startY: number, endX: number, endY: number) {
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const steps = Math.ceil(distance / 15);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;

      const pathArea = {
        x: x,
        y: y,
        radius: 0,
        maxRadius: 40,
        opacity: 1,
        expandingSpeed: 4,
        fadingSpeed: 0.015,
        expanding: true,
        fading: false,
        createdTime: Date.now(),
        life: 600
      };

      this.cursorPathAreas.push(pathArea);
    }
  }

  private getCursorPosition(element: HTMLElement): { x: number; y: number } {
    let x: number, y: number;

    if (element instanceof HTMLInputElement || 
        element instanceof HTMLTextAreaElement ||
        element.isContentEditable) {
      const selectionStart = (element as any).selectionStart;
      const textBeforeCursor = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement 
        ? element.value.substring(0, selectionStart)
        : '';

      const computedStyle = window.getComputedStyle(element);
      const fontSize = parseFloat(computedStyle.fontSize);
      const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize;

      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      tempElement.style.whiteSpace = 'pre-wrap';
      tempElement.style.font = computedStyle.font;
      tempElement.style.fontSize = computedStyle.fontSize;
      tempElement.style.lineHeight = computedStyle.lineHeight;
      tempElement.style.padding = computedStyle.padding;
      tempElement.style.border = computedStyle.border;
      tempElement.textContent = textBeforeCursor;

      document.body.appendChild(tempElement);

      const elementRect = element.getBoundingClientRect();
      const tempRect = tempElement.getBoundingClientRect();

      x = elementRect.left + tempRect.width;
      y = elementRect.top + tempRect.height - (lineHeight / 2);

      document.body.removeChild(tempElement);
    } else {
      const rect = element.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    return { x, y };
  }

  private createClearArea(x: number, y: number) {
    const clearArea = {
      x: x,
      y: y,
      radius: 0,
      maxRadius: 120,
      opacity: 1,
      life: 2500,
      fadeSpeed: 0.008,
      expandingSpeed: 2.5,
      expanding: true,
      createdTime: Date.now()
    };

    this.clearAreas.push(clearArea);
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.drawInitialMask();
  }

  private drawInitialMask() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateMask();
  }

  private drawClearAreas() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const now = Date.now();

    // 绘制并更新主清晰区域
    for (let i = this.clearAreas.length - 1; i >= 0; i--) {
      this.updateAndDrawSingleArea(this.clearAreas[i], this.clearAreas, i, now);
    }

    // 绘制并更新光标路径区域
    for (let i = this.cursorPathAreas.length - 1; i >= 0; i--) {
      this.updateAndDrawSingleArea(this.cursorPathAreas[i], this.cursorPathAreas, i, now);
    }
  }

  private updateAndDrawSingleArea(area: any, areas: Array<any>, index: number, now: number) {
    if (area.expanding) {
      area.radius += area.expandingSpeed;
      if (area.radius >= area.maxRadius) {
        area.radius = area.maxRadius;
        area.expanding = false;
      }
    }

    if (!area.expanding && !area.fading) {
      if (!area.isInputFocus && (now - area.createdTime > area.life)) {
        area.fading = true;
      }
    }

    if (area.fading) {
      area.opacity -= area.fadingSpeed || area.fadeSpeed || 0.008;
      if (area.opacity <= 0) {
        areas.splice(index, 1);
        return;
      }
    }

    this.drawRadialGradient(area.x, area.y, area.radius, area.opacity);
  }

  private drawRadialGradient(x: number, y: number, radius: number, opacity: number) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private updateMask() {
    const dataURL = this.canvas.toDataURL();
    this.overlay.style.maskImage = `url(${dataURL})`;
    this.overlay.style.webkitMaskImage = `url(${dataURL})`;
  }

  private animate() {
    this.drawClearAreas();
    this.updateMask();

    if (this.clearAreas.length > 0 || this.cursorPathAreas.length > 0 || this.isAnimating) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isAnimating = false;
    }
  }

  private startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  // 公共方法
  public toggleEffect() {
    this.isEnabled = !this.isEnabled;
    this.overlay.style.display = this.isEnabled ? 'block' : 'none';
  }

  public adjustBlurStrength(amount: number) {
    this.blurStrength = Math.max(0, Math.min(20, this.blurStrength + amount));
    this.overlay.style.backdropFilter = `blur(${this.blurStrength}px)`;
  }

  public updateSettings(settings: MistSettings) {
    this.blurStrength = settings.blurStrength;
    this.overlay.style.backdropFilter = `blur(${this.blurStrength}px)`;
    // 可以添加更多设置更新逻辑
  }

  public cleanup() {
    // 停止动画
    this.isAnimating = false;
    
    // 移除事件监听器
    window.removeEventListener('resize', () => this.resizeCanvas());
    
    // 移除DOM元素
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // 清空数组
    this.clearAreas = [];
    this.cursorPathAreas = [];
  }
}