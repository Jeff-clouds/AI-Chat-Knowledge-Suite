// 生成唯一ID
window.generateId = function() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// 节流函数
window.throttle = function(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 按照文档顺序排序元素
window.compareElementsByPosition = function(a, b) {
    if (!a || !b) return 0;

    if (a === b) return 0;

    try {
        if (typeof a.compareDocumentPosition === 'function') {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        }
    } catch (e) {
        // Fall through to visual position fallback.
    }

    if (typeof a.getBoundingClientRect === 'function' && typeof b.getBoundingClientRect === 'function') {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        const topDiff = rectA.top - rectB.top;
        if (Math.abs(topDiff) > 1) return topDiff;
        return rectA.left - rectB.left;
    }

    return 0;
}

window.sortElementsByDocumentPosition = function(elements) {
    return elements.sort((a, b) => {
        return window.compareElementsByPosition(a.element, b.element);
    });
}

