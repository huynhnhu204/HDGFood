export interface SuggestionCard {
  id: number
  name: string
  price: number
}

export interface ParsedFoodieResponse {
  text: string
  cards: SuggestionCard[]
}

const CARD_REGEX = /\[SUGGESTION_CARD\](\{[\s\S]*?\})\[\/SUGGESTION_CARD\]/g

export function parseFoodieResponse(raw: string): ParsedFoodieResponse {
  CARD_REGEX.lastIndex = 0
  const cards: SuggestionCard[] = []
  let match: RegExpExecArray | null

  while ((match = CARD_REGEX.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as Partial<SuggestionCard>
      const id = Number(parsed.id)
      const price = Number(parsed.price)
      const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
      if (Number.isFinite(id) && id > 0 && name !== '' && Number.isFinite(price) && price >= 0) {
        cards.push({
          id: Math.trunc(id),
          name,
          price,
        })
      }
    } catch {
      // Ignore malformed card blocks to keep chat usable
    }
  }

  CARD_REGEX.lastIndex = 0
  const text = raw.replace(CARD_REGEX, '').replace(/\n{3,}/g, '\n\n').trim()
  return { text, cards }
}
