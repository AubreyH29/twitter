import { useState } from 'react'
import './EmojiPicker.css'

const CATEGORIES = [
  {
    label: '😊', name: 'Smileys',
    emojis: ['😀','😁','😂','🤣','😊','😇','🥰','😍','🤩','😘','😎','🥳','😜','🤪','🤔','🤭','🤗','😏','😒','😔','😢','😭','😤','😡','🤬','😱','😳','🥺','🙄','😴','😷','🥴','🤯','🤠','🧐'],
  },
  {
    label: '👍', name: 'Gestures',
    emojis: ['👋','🤚','✋','👌','✌️','🤞','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👏','🙌','🫶','🙏','🤝','💅','🤳'],
  },
  {
    label: '❤️', name: 'Hearts & Symbols',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','💥','🔥','💯','🎉','🎊','💫','⭐','🌟','💢','🕊️','☮️','💎'],
  },
  {
    label: '🐶', name: 'Animals & Nature',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦋','🐝','🌸','🌺','🌻','🌹','🌷','🌴','🌲','🍀','🌿','🍁'],
  },
  {
    label: '🍕', name: 'Food & Drink',
    emojis: ['🍕','🍔','🍟','🌮','🌯','🍜','🍝','🍣','🍱','🥗','🍩','🎂','🍰','🧁','🍭','🍫','☕','🍵','🧃','🥤','🧋','🍺','🥂','🍾','🍸','🍹','🍎','🍊','🍋','🍇','🍓','🥑','🍿','🧀'],
  },
  {
    label: '⚽', name: 'Activities',
    emojis: ['⚽','🏀','🏈','⚾','🎾','🏐','🏆','🥇','🥈','🥉','🎮','🕹️','🎯','🎲','🎸','🎹','🎤','🎧','🎨','🎭','🎬','📸','🎪','🤹','🏋️','🤸','🏊','🚴','🧗','🏄'],
  },
  {
    label: '✈️', name: 'Travel & Places',
    emojis: ['✈️','🚀','🛸','🚁','⛵','🚢','🚂','🚗','🚕','🏎️','🏍️','🚲','🛵','🌍','🌎','🌏','🗺️','🏔️','🌋','🏖️','🏝️','🗼','🗽','⛪','🏰','🏯','🌉','🌃','🌇','🌆'],
  },
  {
    label: '💻', name: 'Objects',
    emojis: ['💻','🖥️','📱','⌚','📷','🎥','📺','📻','🎁','💎','👑','🔑','🔒','💰','💳','📚','📝','✏️','📌','🔔','💡','🔦','🧸','🎀','🛍️','🧳','🌂','🪴','🧲','⚙️','🔧'],
  },
]

export default function EmojiPicker({ onSelect }) {
  const [activeCategory, setActiveCategory] = useState(0)

  return (
    <div className="emoji-picker" onMouseDown={e => e.preventDefault()}>
      <div className="emoji-categories">
        {CATEGORIES.map((cat, i) => (
          <button
            key={i}
            type="button"
            className={`emoji-cat-btn${activeCategory === i ? ' active' : ''}`}
            onClick={() => setActiveCategory(i)}
            title={cat.name}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="emoji-category-label">{CATEGORIES[activeCategory].name}</div>
      <div className="emoji-grid">
        {CATEGORIES[activeCategory].emojis.map((emoji, i) => (
          <button
            key={i}
            type="button"
            className="emoji-btn"
            onClick={() => onSelect(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
