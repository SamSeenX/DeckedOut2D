export const keys = {};
export const mouse = { x: 0, y: 0 };

export function initInput(canvas) {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
        mouse.y = ((e.clientY - rect.top) / canvas.height) * 2 - 1;
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote') { // ` key
            window.debugMode = !window.debugMode;
            console.log("Debug Mode:", window.debugMode);
        }
    });
}
