export const GetDiceRoll = (i) => Math.floor(Math.random() * i) + 1
export const GetMultiDiceRoll = (n, d) => [(0).n].map((_) => GetDiceRoll(d))
export const GetRandomBetween = (l, h) => GetDiceRoll(h - l) + h
