import { RowsIcon } from '@phosphor-icons/react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@workspace/ui/components/sidebar'
import type * as React from 'react'
import docRoutes from '../content/doc-routes.json'

type Item = { slug: string; title: string }
type Section = { items: Item[]; slug: string; title: string }
const sections = (docRoutes as { sections: Section[] }).sections

const itemHref = (sectionSlug: string, itemSlug: string) =>
  `/docs/${sectionSlug}/${itemSlug}`

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { location } = useRouterState()
  const currentPath = location.pathname

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <RowsIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Banhmi Docs</span>
                <span>v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sections.map((section) => {
              const items =
                section.items.length > 0
                  ? section.items
                  : [{ slug: 'index', title: section.title }]
              return (
                <SidebarMenuItem key={section.slug}>
                  <SidebarMenuButton className="font-medium">
                    {section.title}
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {items.map((item) => {
                      const href = itemHref(section.slug, item.slug)
                      return (
                        <SidebarMenuSubItem
                          key={`${section.slug}/${item.slug}`}
                        >
                          <SidebarMenuSubButton
                            isActive={currentPath === href}
                            render={<Link to={href} />}
                          >
                            {item.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
