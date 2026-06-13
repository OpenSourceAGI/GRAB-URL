/**
 * @file loading-animations-emojis for the terminal
 *
 * Each spinner is either a plain `string` (1 char per frame) or a
 * `[string, n]` tuple where `n` is the character length of each frame.
 * To get frames: split the string into chunks of `n` characters.
 *
 * Named exports allow bundlers to tree-shake unused spinners,
 * so only the ones you actually import end up in the final bundle.
 *
 * @example
 * import { dots, bouncingBar } from './spinners.js';
 *
 * // plain string (n=1) — split per character
 * [...dots] // => ["⠋", "⠙", "⠹", ...]
 */
export const dots = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏",
  dots2 = "⣾⣽⣻⢿⡿⣟⣯⣷",
  dots3 = "⠋⠙⠚⠞⠖⠦⠴⠲⠳⠓",
  dots4 = "⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆",
  dots5 = "⠋⠙⠚⠒⠂⠂⠒⠲⠴⠦⠖⠒⠐⠐⠒⠓⠋",
  dots6 = "⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠴⠲⠒⠂⠂⠒⠚⠙⠉⠁",
  dots7 = "⠈⠉⠋⠓⠒⠐⠐⠒⠖⠦⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈",
  dots8 = "⠁⠁⠉⠙⠚⠒⠂⠂⠒⠲⠴⠤⠄⠄⠤⠠⠠⠤⠦⠖⠒⠐⠐⠒⠓⠋⠉⠈⠈",
  dots9 = "⢹⢺⢼⣸⣇⡧⡗⡏",
  dots10 = "⢄⢂⢁⡁⡈⡐⡠",
  dots11 = "⠁⠂⠄⡀⢀⠠⠐⠈",
  dots12 = [
    "⢀⠀⡀⠀⠄⠀⢂⠀⡂⠀⠅⠀⢃⠀⡃⠀⠍⠀⢋⠀⡋⠀⠍⠁⢋⠁⡋⠁⠍⠉⠋⠉⠋⠉⠉⠙⠉⠙⠉⠩⠈⢙⠈⡙⢈⠩⡀⢙⠄⡙⢂⠩⡂⢘⠅⡘⢃⠨⡃⢐⠍⡐⢋⠠⡋⢀⠍⡁⢋⠁⡋⠁⠍⠉⠋⠉⠋⠉⠉⠙⠉⠙⠉⠩⠈⢙⠈⡙⠈⠩⠀⢙⠀⡙⠀⠩⠀⢘⠀⡘⠀⠨⠀⢐⠀⡐⠀⠠⠀⢀⠀⡀",
    2,
  ],
  dots13 = "⣼⣹⢻⠿⡟⣏⣧⣶",
  dots14 = ["⠉⠉⠈⠙⠀⠹⠀⢸⠀⣰⢀⣠⣀⣀⣄⡀⣆⠀⡇⠀⠏⠀⠋⠁", 2],
  dotsCircle = ["⢎ ⠎⠁⠊⠑⠈⠱ ⡱⢀⡰⢄⡠⢆⡀", 2],
  sand = "⠁⠂⠄⡀⡈⡐⡠⣀⣁⣂⣄⣌⣔⣤⣥⣦⣮⣶⣷⣿⡿⠿⢟⠟⡛⠛⠫⢋⠋⠍⡉⠉⠑⠡⢁",
  line = "-\\|/",
  pipe = "┤┘┴└├┌┬┐",
  simpleDotsScrolling = [".  .. ... ..  .   ", 3],
  star = "✶✸✹✺✹✷",
  flip = "___-``'´-___",
  growVertical = "▁▃▄▅▆▇▆▅▄▃",
  growHorizontal = "▏▎▍▌▋▊▉▊▋▌▍▎",
  balloon = " .oO@* ",
  balloon2 = ".oO°Oo.",
  noise = "▓▒░",
  boxBounce = "▖▘▝▗",
  boxBounce2 = "▌▀▐▄",
  triangle = "◢◣◤◥",
  arc = "◜◠◝◞◡◟",
  circle = "◡⊙◠",
  squareCorners = "◰◳◲◱",
  circleQuarters = "◴◷◶◵",
  circleHalves = "◐◓◑◒",
  squish = "╫╪",
  toggle3 = "□■",
  toggle4 = "■□▪▫",
  toggle5 = "▮▯",
  toggle6 = "ဝ၀",
  toggle7 = "⦾⦿",
  toggle8 = "◍◌",
  toggle9 = "◉◎",
  toggle10 = "㊂㊀㊁",
  toggle11 = "⧇⧆",
  toggle12 = "☗☖",
  arrow = "←↖↑↗→↘↓↙",
  arrow2 = ["⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ", 3],
  arrow3 = ["▹▹▹▹▹▸▹▹▹▹▹▸▹▹▹▹▹▸▹▹▹▹▹▸▹▹▹▹▹▸", 5],
  bouncingBar = [
    "[    ][=   ][==  ][=== ][====][ ===][  ==][   =][    ][   =][  ==][ ===][====][=== ][==  ][=   ]",
    6,
  ],
  bouncingBall = [
    "( ●    )(  ●   )(   ●  )(    ● )(     ●)(    ● )(   ●  )(  ●   )( ●    )(●     )",
    8,
  ],
  smiley = ["😄 😝 ", 3],
  monkey = ["🙈 🙈 🙉 🙊 ", 3],
  hearts = ["💛 💙 💜 💚 ❤️ ", 3],
  clock = ["🕛 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 🕘 🕙 🕚 ", 3],
  earth = ["🌍 🌎 🌏 ", 3],
  moon = ["🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 ", 3],
  runner = ["🚶 🏃 ", 3],
  weather = [
    "☀️ ☀️ ☀️ 🌤 ⛅️ 🌥 ☁️ 🌧 🌨 🌧 🌨 🌧 🌨 ⛈  🌨 🌧 🌨 ☁️ 🌥 ⛅️ 🌤 ☀️ ☀️ ",
    3,
  ],
  christmas = ["🌲🎄", 2],
  grenade = ["،  ′   ´  ‾   ⸌  ⸊  |  ⁎  ⁕ ෴   ⁓         ", 3],
  point = ["∙∙∙●∙∙∙●∙∙∙●∙∙∙", 3],
  betaWave = ["ρβββββββρβββββββρβββββββρβββββββρβββββββρβββββββρ", 7],
  fingerDance = ["🤘 🤟 🖖 ✋  🤚 👆 ", 3],
  mindblown = ["😐 😐 😮 😮 😦 😦 😧 😧 🤯 💥 ✨  　  　  　  ", 3],
  speaker = ["🔈 🔉 🔊 🔉 ", 3],
  orangePulse = ["🔸 🔶 🟠 🟠 🔶 ", 3],
  bluePulse = ["🔹 🔷 🔵 🔵 🔷 ", 3],
  orangeBluePulse = ["🔸 🔶 🟠 🟠 🔶 🔹 🔷 🔵 🔵 🔷 ", 3],
  timeTravel = ["🕛 🕚 🕙 🕘 🕗 🕖 🕕 🕔 🕓 🕒 🕑 🕐 ", 3],
  aesthetic = ["▰▱▱▱▱▱▱▰▰▱▱▱▱▱▰▰▰▱▱▱▱▰▰▰▰▱▱▱▰▰▰▰▰▱▱▰▰▰▰▰▰▱▰▰▰▰▰▰▰▰▱▱▱▱▱▱", 7];
