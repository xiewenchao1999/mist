class FrostedGlassEffect {
    constructor() {
        this.canvas = document.getElementById('maskCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.querySelector('.fog-overlay');
        this.container = document.querySelector('.container');
        
        this.clearAreas = [];
        this.cursorPathAreas = []; // 存储光标路径上的临时清晰区域
        this.isAnimating = false;
        this.lastCursorPos = null; // 上一个光标位置
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        this.setupInputEventListeners();
        this.drawInitialMask();
        this.startAnimation();
    }
    
    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.drawInitialMask();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        // 为了确保点击事件能被正确捕获，将事件监听器绑定到body上
        document.body.addEventListener('click', (e) => {
            // 检查点击目标是否在container内
            const rect = this.container.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && 
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                this.handleClick(e);
            }
        });
    }
    
    setupInputEventListeners() {
        const inputElements = document.querySelectorAll('input, textarea');
        
        inputElements.forEach(input => {
            input.addEventListener('focus', (e) => this.handleInputFocus(e));
            input.addEventListener('blur', (e) => this.handleInputBlur(e));
        });
    }
    
    handleInputFocus(e) {
        const containerRect = this.container.getBoundingClientRect();
        
        // 获取初始光标位置
        const cursorPos = this.getCursorPosition(e.target);
        const x = cursorPos.x - containerRect.left;
        const y = cursorPos.y - containerRect.top;
        
        // 只让光标具体位置变为清晰区域，设置固定的小半径
        const maxRadius = 60; // 光标周围60px的清晰区域
        
        // 创建一个持久的清晰区域，不会自动模糊
        const clearArea = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: maxRadius,
            opacity: 1,
            expandingSpeed: 3,
            expanding: true,
            isInputFocus: true,
            target: e.target,
            createdTime: Date.now()
        };
        
        // 存储输入元素对应的清晰区域ID
        e.target._clearArea = clearArea;
        this.clearAreas.push(clearArea);
        
        // 添加光标移动监听
        this.addCursorMoveListeners(e.target);
    }
    
    handleInputBlur(e) {
        if (e.target._clearArea) {
            // 标记输入元素的清晰区域为可移除
            e.target._clearArea.isInputFocus = false;
            e.target._clearArea.fading = true;
            e.target._clearArea.fadeSpeed = 0.02; // 快速淡出
            delete e.target._clearArea;
        }
        
        // 移除光标移动监听
        this.removeCursorMoveListeners(e.target);
    }
    
    // 获取光标位置
    getCursorPosition(element) {
        let x, y;
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            // 对于输入元素，使用更可靠的方法获取光标位置
            const selectionStart = element.selectionStart;
            const textBeforeCursor = element.value.substring(0, selectionStart);
            
            // 获取计算样式
            const computedStyle = window.getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize);
            const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize;
            
            // 创建一个临时元素来测量文本宽度
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
            
            // 获取元素在视口中的位置
            const elementRect = element.getBoundingClientRect();
            const tempRect = tempElement.getBoundingClientRect();
            
            // 计算光标位置
            x = elementRect.left + tempRect.width;
            // 向上偏移半个字高，保证当前行在清晰区域中间
            y = elementRect.top + tempRect.height - (lineHeight / 2);
            
            // 移除临时元素
            document.body.removeChild(tempElement);
        } else {
            // 默认情况
            const rect = element.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }
        
        return { x, y };
    }
    
    // 添加光标移动监听
    addCursorMoveListeners(element) {
        // 输入事件
        element.addEventListener('input', (e) => this.updateClearAreaPosition(e.target));
        // 按键事件（左右箭头、上下箭头等）
        element.addEventListener('keydown', (e) => {
            // 延迟更新，确保光标位置已更新
            setTimeout(() => this.updateClearAreaPosition(e.target), 0);
        });
        // 鼠标点击事件
        element.addEventListener('click', (e) => this.updateClearAreaPosition(e.target));
    }
    
    // 移除光标移动监听
    removeCursorMoveListeners(element) {
        element.removeEventListener('input', (e) => this.updateClearAreaPosition(e.target));
        element.removeEventListener('keydown', (e) => {
            setTimeout(() => this.updateClearAreaPosition(e.target), 0);
        });
        element.removeEventListener('click', (e) => this.updateClearAreaPosition(e.target));
    }
    
    // 更新清晰区域位置
    updateClearAreaPosition(element) {
        if (!element._clearArea) return;
        
        const containerRect = this.container.getBoundingClientRect();
        const cursorPos = this.getCursorPosition(element);
        const currentX = cursorPos.x - containerRect.left;
        const currentY = cursorPos.y - containerRect.top;
        
        // 更新主清晰区域位置
        const clearArea = element._clearArea;
        clearArea.x = currentX;
        clearArea.y = currentY;
        
        // 处理光标移动路径效果
        if (this.lastCursorPos) {
            const lastX = this.lastCursorPos.x;
            const lastY = this.lastCursorPos.y;
            
            // 计算光标移动距离
            const distance = Math.sqrt(Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2));
            
            // 如果移动距离足够大，生成路径上的临时清晰区域
            // 降低阈值，确保输入导致的光标移动也能触发
            if (distance > 5) {
                this.generateCursorPathAreas(lastX, lastY, currentX, currentY);
            }
        }
        
        // 更新上一个光标位置
        this.lastCursorPos = { x: currentX, y: currentY };
    }
    
    // 在光标移动路径上生成临时清晰区域
    generateCursorPathAreas(startX, startY, endX, endY) {
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        // 每15px生成一个区域，确保路径效果连续
        const steps = Math.ceil(distance / 15);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // 使用线性插值计算路径上的点，保持与主清晰区域一致的Y坐标偏移
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            // 创建路径上的临时清晰区域
            const pathArea = {
                x: x,
                y: y,
                radius: 0,
                maxRadius: 40, // 路径上的清晰区域半径较小
                opacity: 1,
                expandingSpeed: 4,
                fadingSpeed: 0.015,
                expanding: true,
                fading: false,
                createdTime: Date.now(),
                life: 600 // 600毫秒后开始淡出
            };
            
            this.cursorPathAreas.push(pathArea);
        }
    }
    
    handleClick(e) {
        // 检查点击目标是否为输入元素，如果是则不创建普通清晰区域
        // 因为输入元素会通过focus事件创建专门的清晰区域
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.createClearArea(x, y);
    }
    
    createClearArea(x, y) {
        const clearArea = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: 120,
            opacity: 1,
            life: 2500, // 2.5秒后开始模糊
            fadeSpeed: 0.008,
            expandingSpeed: 2.5,
            expanding: true,
            createdTime: Date.now()
        };
        
        this.clearAreas.push(clearArea);
    }
    
    drawInitialMask() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateMask();
    }
    
    drawClearAreas() {
        // 清空画布
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const now = Date.now();
        
        // 绘制并更新主清晰区域（从后往前遍历，确保安全删除）
        for (let i = this.clearAreas.length - 1; i >= 0; i--) {
            this.updateAndDrawSingleArea(this.clearAreas[i], this.clearAreas, i, now);
        }
        
        // 绘制并更新光标路径区域（从后往前遍历，确保安全删除）
        for (let i = this.cursorPathAreas.length - 1; i >= 0; i--) {
            this.updateAndDrawSingleArea(this.cursorPathAreas[i], this.cursorPathAreas, i, now);
        }
    }
    
    /**
     * 更新并绘制单个区域
     * @param {Object} area - 区域对象
     * @param {Array} areas - 区域数组
     * @param {number} index - 区域索引
     * @param {number} now - 当前时间戳
     */
    updateAndDrawSingleArea(area, areas, index, now) {
        // 处理区域扩展
        if (area.expanding) {
            area.radius += area.expandingSpeed;
            if (area.radius >= area.maxRadius) {
                area.radius = area.maxRadius;
                area.expanding = false;
            }
        }
        
        // 处理区域淡出
        if (!area.expanding && !area.fading) {
            // 输入焦点区域不会自动淡出
            if (!area.isInputFocus && (now - area.createdTime > area.life)) {
                area.fading = true;
            }
        }
        
        if (area.fading) {
            // 使用适当的淡出速度，优先使用fadingSpeed，其次是fadeSpeed，最后使用默认值
            area.opacity -= area.fadingSpeed || area.fadeSpeed || 0.008;
            if (area.opacity <= 0) {
                // 移除完全透明的区域
                areas.splice(index, 1);
                return;
            }
        }
        
        // 绘制径向渐变
        this.drawRadialGradient(area.x, area.y, area.radius, area.opacity);
    }
    
    drawRadialGradient(x, y, radius, opacity) {
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
    
    updateMask() {
        const dataURL = this.canvas.toDataURL();
        this.overlay.style.maskImage = `url(${dataURL})`;
        this.overlay.style.webkitMaskImage = `url(${dataURL})`;
    }
    
    animate() {
        this.drawClearAreas();
        this.updateMask();
        
        // 确保在还有清晰区域或光标路径区域时继续动画
        if (this.clearAreas.length > 0 || this.cursorPathAreas.length > 0 || this.isAnimating) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isAnimating = false;
        }
    }
    
    startAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.animate();
        }
    }
}

// 初始化效果
document.addEventListener('DOMContentLoaded', () => {
    new FrostedGlassEffect();
});