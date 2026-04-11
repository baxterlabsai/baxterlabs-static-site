import { Component, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  PROTECTED: SectionErrorBoundary                                    */
/*  Prevents a single malformed row or rendering bug from white-       */
/*  screening an entire page via React's "Objects are not valid as a   */
/*  React child" or similar render errors. Wrap any section that       */
/*  renders data from an external source (Cowork write-back tables,    */
/*  signed URLs, JSONB blobs) so one bad row degrades to a muted       */
/*  fallback instead of killing the whole page. Do not remove.         */
/* ------------------------------------------------------------------ */

interface Props {
  fallback: ReactNode
  label?: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    const label = this.props.label || 'Section'
    console.error(`[${label}] crashed, showing fallback:`, error)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
