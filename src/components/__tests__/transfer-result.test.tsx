import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import TransferResult from '../transfer-result'

describe('TransferResult', () => {
  it('renders success state', () => {
    render(<TransferResult status="success" message="Done" onClose={() => {}} />)
    expect(screen.getByText(/Payment Sent/i)).toBeInTheDocument()
    expect(screen.getByText(/Done/i)).toBeInTheDocument()
  })

  it('renders insufficient balance state', () => {
    render(<TransferResult status="insufficient_balance" message="Not enough" onClose={() => {}} />)
    expect(screen.getByText(/Insufficient Balance/i)).toBeInTheDocument()
    expect(screen.getByText(/Not enough/i)).toBeInTheDocument()
  })

  it('renders timeout state', () => {
    render(<TransferResult status="timeout" message="Try again" onClose={() => {}} />)
    expect(screen.getByText(/Network Timeout/i)).toBeInTheDocument()
    expect(screen.getByText(/Try again/i)).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<TransferResult status="error" message="Failed" onClose={() => {}} />)
    expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Failed/i).length).toBeGreaterThan(0)
  })
})
