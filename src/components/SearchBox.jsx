import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SearchBox({ autoFocus = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setValue(searchParams.get('q') || '')
  }, [searchParams])

  function handleSubmit(e) {
    e.preventDefault()
    const q = value.trim()
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore')
  }

  return (
    <form className="search-box" role="search" onSubmit={handleSubmit}>
      <input
        type="search"
        placeholder="Search posts"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus={autoFocus}
        aria-label="Search posts"
      />
      <button className="search-icon" type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M16.5 16.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </form>
  )
}
