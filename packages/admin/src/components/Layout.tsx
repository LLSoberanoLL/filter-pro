import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Button } from './ui/button'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-xl font-bold">
                Filter Pro Admin
              </Link>
              <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
                Projetos
              </Link>
            </div>
            <div>
              <Button variant="ghost" size="sm">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}