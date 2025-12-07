import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const groups = [
    {
        label: "Personal Account",
        teams: [
            {
                label: "John Doe",
                value: "personal",
            },
        ],
    },
    {
        label: "Teams",
        teams: [
            {
                label: "Acme Inc.",
                value: "acme-inc",
            },
            {
                label: "Monsters Inc.",
                value: "monsters",
            },
        ],
    },
]

type Team = (typeof groups)[number]["teams"][number]

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface TeamSwitcherProps extends PopoverTriggerProps { }

export default function ProjectSwitcher({ className }: TeamSwitcherProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedTeam, setSelectedTeam] = React.useState<Team>(
        groups[0].teams[0]
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Select a team"
                    className={cn(
                        "w-full justify-between bg-[hsl(217,33%,10%)] border-[hsl(217,33%,18%)] text-white hover:bg-[hsl(217,33%,14%)] hover:text-white hover:border-[hsl(217,33%,22%)]",
                        className
                    )}
                >
                    <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage
                            src={`https://avatar.vercel.sh/${selectedTeam.value}.png`}
                            alt={selectedTeam.label}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs">
                            {selectedTeam.label.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{selectedTeam.label}</span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-[hsl(215,20%,55%)]" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0 bg-[hsl(222,47%,8%)] border-[hsl(217,33%,18%)]">
                <Command className="bg-transparent">
                    <CommandList>
                        <CommandInput 
                            placeholder="Search team..." 
                            className="text-white placeholder:text-[hsl(215,20%,45%)]"
                        />
                        <CommandEmpty className="text-[hsl(215,20%,55%)] text-sm py-6 text-center">
                            No team found.
                        </CommandEmpty>
                        {groups.map((group) => (
                            <CommandGroup 
                                key={group.label} 
                                heading={group.label}
                                className="text-[hsl(215,20%,45%)] [&_[cmdk-group-heading]]:text-[hsl(215,20%,45%)] [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                            >
                                {group.teams.map((team) => (
                                    <CommandItem
                                        key={team.value}
                                        onSelect={() => {
                                            setSelectedTeam(team)
                                            setOpen(false)
                                        }}
                                        className="text-sm text-white hover:bg-[hsl(217,33%,14%)] aria-selected:bg-[hsl(217,33%,14%)]"
                                    >
                                        <Avatar className="mr-2 h-5 w-5">
                                            <AvatarImage
                                                src={`https://avatar.vercel.sh/${team.value}.png`}
                                                alt={team.label}
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs">
                                                {team.label.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {team.label}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4 text-cyan-400",
                                                selectedTeam.value === team.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                    <CommandSeparator className="bg-[hsl(217,33%,18%)]" />
                    <CommandList>
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setOpen(false)
                                }}
                                className="text-sm text-[hsl(215,20%,65%)] hover:bg-[hsl(217,33%,14%)] hover:text-white aria-selected:bg-[hsl(217,33%,14%)]"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Team
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
