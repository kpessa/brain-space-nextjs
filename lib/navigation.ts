import {
  BookOpen,
  Brain,
  Trophy,
  Clock,
  SunMoon,
  Calendar,
  Network,
  Grid3x3,
  ListTodo,
  Repeat,
} from 'lucide-react'

export const navigation = [
  { name: 'Todos', href: '/todos', icon: ListTodo },
  { name: 'Journal', href: '/journal', icon: BookOpen },
  { name: 'Nodes', href: '/nodes', icon: Network },
  { name: 'Brain Dump', href: '/braindump', icon: Brain },
  { name: 'Matrix', href: '/matrix', icon: Grid3x3 },
  { name: 'Recurring', href: '/recurring', icon: Repeat },
  { name: 'Progress', href: '/progress', icon: Trophy },
  { name: 'Timebox', href: '/timebox', icon: Clock },
  { name: 'Routines', href: '/routines', icon: SunMoon },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
]