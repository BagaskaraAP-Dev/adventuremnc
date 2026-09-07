const hip = -1.57; // 90 deg forward
const knee = 0.63; 
const shin_length = 0.34;
const knee_y = 0.70;
const shin_angle = hip + knee;
const boot_y = knee_y - shin_length * Math.cos(shin_angle);
const boot_y_rover = -0.68 + boot_y + 0.22;
console.log("Boot Y (relative to rover center):", boot_y_rover);
