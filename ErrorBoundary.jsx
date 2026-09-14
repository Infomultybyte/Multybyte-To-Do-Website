import { Component } from 'react'

/**
 * Last-resort safety net. React unmounts the entire tree on an uncaught
 * render error, which without a boundary shows a blank white screen.
 * This catches that and shows a friendly message with a reload action
 * instead. It cannot catch errors in event handlers or async code (React
 * doesn't route those here) — those are handled locally where they
 * happen (see useStaffTodos' per-cell error state, and AuthContext).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unexpected error caught by ErrorBoundary:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-paper px-6">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-800">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              An unexpected error occurred. Try reloading the page — if this keeps
              happening, contact your administrator.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 rounded-md bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
