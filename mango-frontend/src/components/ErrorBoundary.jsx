import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center bg-white">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Kuch gadbad ho gayi</h2>
          <p className="text-sm text-gray-500 mb-6">Page load nahi ho saka. Reload karo.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
          >
            🔄 Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
