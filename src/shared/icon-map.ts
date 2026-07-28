import { type ComponentType } from 'react'

import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiGlobe,
  FiLink,
  FiFileText,
  FiAward,
  FiBookOpen,
  FiCode,
  FiDatabase,
  FiGitBranch,
  FiHeart,
  FiHome,
  FiLayers,
  FiMessageSquare,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiFlag,
  FiHash,
  FiImage,
  FiPenTool,
  FiTerminal,
  FiActivity,
  FiAnchor,
  FiAtSign,
  FiBarChart2,
  FiBell,
  FiBook,
  FiBookmark,
  FiBox,
  FiCamera,
  FiCheckCircle,
  FiClipboard,
  FiCloud,
  FiCoffee,
  FiCompass,
  FiCpu,
  FiCreditCard,
  FiDisc,
  FiDownload,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiFeather,
  FiFile,
  FiFolder,
  FiGift,
  FiGrid,
  FiHeadphones,
  FiHexagon,
  FiKey,
  FiLayout,
  FiLifeBuoy,
  FiLock,
  FiMap,
  FiMic,
  FiMonitor,
  FiMusic,
  FiPackage,
  FiPaperclip,
  FiPercent,
  FiPieChart,
  FiPocket,
  FiPrinter,
  FiRadio,
  FiRss,
  FiSend,
  FiServer,
  FiSettings,
  FiShare2,
  FiShield,
  FiShoppingBag,
  FiSmartphone,
  FiSmile,
  FiSun,
  FiTag,
  FiThumbsUp,
  FiTool,
  FiTruck,
  FiTv,
  FiType,
  FiUpload,
  FiUserCheck,
  FiVideo,
  FiWatch,
  FiWifi
} from 'react-icons/fi'

import {
  SiGithub,
  SiDribbble,
  SiBehance,
  SiMedium,
  SiStackoverflow,
  SiYoutube,
  SiNotion,
  SiFigma,
  SiDiscord,
  SiTelegram,
  SiReddit,
  SiInstagram,
  SiFacebook,
  SiSpotify,
  SiGoogle,
  SiReact,
  SiTypescript,
  SiPython,
  SiNodedotjs,
  SiDocker,
  SiFirebase,
  SiVercel,
  SiGitlab,
  SiBitbucket,
  SiNpm,
  SiTailwindcss,
  SiPostgresql,
  SiMongodb,
  SiAngular,
  SiNextdotjs,
  SiNetlify
} from 'react-icons/si'

import { FaLinkedin, FaTwitter } from 'react-icons/fa'

export interface IconEntry {
  id: string
  label: string | string[]
  component: ComponentType<{ className?: string }>
}

/** Returns the primary (display) label for an icon entry. */
export function getIconLabel(entry: IconEntry): string {
  return Array.isArray(entry.label) ? entry.label[0] : entry.label
}

/** Returns true if any label in the entry matches the search term. */
export function iconMatchesSearch(entry: IconEntry, term: string): boolean {
  const lower = term.toLowerCase()
  if (Array.isArray(entry.label)) {
    return entry.label.some((l) => l.toLowerCase().includes(lower))
  }
  return entry.label.toLowerCase().includes(lower)
}

export const ICON_REGISTRY: IconEntry[] = [
  // People & Identity
  { id: 'FiUser', label: ['User', 'Person', 'Profile', 'Name'], component: FiUser },
  { id: 'FiUsers', label: ['Users', 'Team', 'Group', 'People'], component: FiUsers },
  { id: 'FiUserCheck', label: ['User Check', 'Verified', 'Approved'], component: FiUserCheck },
  { id: 'FiSmile', label: ['Smile', 'Happy', 'Emoji', 'Face'], component: FiSmile },

  // Communication
  { id: 'FiMail', label: ['Email', 'Mail', 'Envelope', 'Inbox'], component: FiMail },
  { id: 'FiPhone', label: ['Phone', 'Call', 'Mobile', 'Contact'], component: FiPhone },
  {
    id: 'FiMessageSquare',
    label: ['Message', 'Chat', 'Comment', 'SMS'],
    component: FiMessageSquare
  },
  { id: 'FiSend', label: ['Send', 'Submit', 'Paper Plane'], component: FiSend },
  { id: 'FiAtSign', label: ['At Sign', 'Email', 'Mention', '@'], component: FiAtSign },
  { id: 'FiBell', label: ['Bell', 'Notification', 'Alert', 'Reminder'], component: FiBell },
  { id: 'FiMic', label: ['Microphone', 'Audio', 'Voice', 'Record'], component: FiMic },
  { id: 'FiVideo', label: ['Video', 'Camera', 'Meeting', 'Record'], component: FiVideo },
  { id: 'FiRadio', label: ['Radio', 'Broadcast', 'Signal'], component: FiRadio },
  { id: 'FiRss', label: ['RSS', 'Feed', 'Blog', 'Subscribe'], component: FiRss },

  // Location
  { id: 'FiMapPin', label: ['Location', 'Map Pin', 'Address', 'Place'], component: FiMapPin },
  { id: 'FiHome', label: ['Home', 'House', 'Residence', 'Address'], component: FiHome },
  {
    id: 'FiGlobe',
    label: ['Globe', 'World', 'Website', 'Internet', 'Language'],
    component: FiGlobe
  },
  { id: 'FiMap', label: ['Map', 'Navigation', 'Direction'], component: FiMap },
  { id: 'FiCompass', label: ['Compass', 'Navigate', 'Explore'], component: FiCompass },

  // Work & Career
  {
    id: 'FiBriefcase',
    label: ['Briefcase', 'Work', 'Job', 'Career', 'Company'],
    component: FiBriefcase
  },
  {
    id: 'FiDollarSign',
    label: ['Dollar', 'Money', 'Salary', 'CTC', 'Payment', 'Finance'],
    component: FiDollarSign
  },
  {
    id: 'FiTrendingUp',
    label: ['Trending', 'Growth', 'Experience', 'Progress'],
    component: FiTrendingUp
  },
  { id: 'FiTarget', label: ['Target', 'Goal', 'Objective', 'Aim'], component: FiTarget },
  {
    id: 'FiAward',
    label: ['Award', 'Achievement', 'Medal', 'Prize', 'Certificate'],
    component: FiAward
  },
  { id: 'FiStar', label: ['Star', 'Favorite', 'Rating', 'Featured'], component: FiStar },
  { id: 'FiFlag', label: ['Flag', 'Country', 'Milestone', 'Report'], component: FiFlag },
  {
    id: 'FiBarChart2',
    label: ['Bar Chart', 'Analytics', 'Statistics', 'Data'],
    component: FiBarChart2
  },
  { id: 'FiPieChart', label: ['Pie Chart', 'Analytics', 'Statistics'], component: FiPieChart },
  { id: 'FiPercent', label: ['Percent', 'Discount', 'Rate', 'Score'], component: FiPercent },
  { id: 'FiActivity', label: ['Activity', 'Pulse', 'Health', 'Fitness'], component: FiActivity },
  {
    id: 'FiCreditCard',
    label: ['Credit Card', 'Payment', 'Bank', 'Finance'],
    component: FiCreditCard
  },
  {
    id: 'FiShoppingBag',
    label: ['Shopping Bag', 'Store', 'Commerce', 'Purchase'],
    component: FiShoppingBag
  },
  { id: 'FiTruck', label: ['Truck', 'Delivery', 'Shipping', 'Logistics'], component: FiTruck },

  // Time
  { id: 'FiCalendar', label: ['Calendar', 'Date', 'Schedule', 'Event'], component: FiCalendar },
  {
    id: 'FiClock',
    label: ['Clock', 'Time', 'Notice Period', 'Hours', 'Duration'],
    component: FiClock
  },
  { id: 'FiWatch', label: ['Watch', 'Time', 'Wearable'], component: FiWatch },

  // Tech & Dev
  { id: 'FiCode', label: ['Code', 'Developer', 'Programming', 'Skills'], component: FiCode },
  {
    id: 'FiTerminal',
    label: ['Terminal', 'Console', 'Command', 'Shell', 'CLI'],
    component: FiTerminal
  },
  { id: 'FiDatabase', label: ['Database', 'Storage', 'Data', 'SQL'], component: FiDatabase },
  {
    id: 'FiGitBranch',
    label: ['Git Branch', 'Version', 'Repository', 'Source'],
    component: FiGitBranch
  },
  { id: 'FiLayers', label: ['Layers', 'Stack', 'Fullstack', 'Architecture'], component: FiLayers },
  { id: 'FiZap', label: ['Zap', 'Lightning', 'Fast', 'Energy', 'Power'], component: FiZap },
  { id: 'FiCpu', label: ['CPU', 'Processor', 'Hardware', 'Chip'], component: FiCpu },
  {
    id: 'FiServer',
    label: ['Server', 'Backend', 'Hosting', 'Infrastructure'],
    component: FiServer
  },
  { id: 'FiCloud', label: ['Cloud', 'Hosting', 'SaaS', 'AWS', 'Deploy'], component: FiCloud },
  { id: 'FiMonitor', label: ['Monitor', 'Desktop', 'Screen', 'Display'], component: FiMonitor },
  { id: 'FiSmartphone', label: ['Smartphone', 'Mobile', 'Phone', 'App'], component: FiSmartphone },
  { id: 'FiWifi', label: ['WiFi', 'Internet', 'Network', 'Wireless'], component: FiWifi },
  { id: 'FiHexagon', label: ['Hexagon', 'Shape', 'Module', 'Component'], component: FiHexagon },
  {
    id: 'FiPackage',
    label: ['Package', 'Module', 'Library', 'Bundle', 'NPM'],
    component: FiPackage
  },
  { id: 'FiGrid', label: ['Grid', 'Dashboard', 'Apps', 'Layout'], component: FiGrid },
  { id: 'FiLayout', label: ['Layout', 'UI', 'Design', 'Template'], component: FiLayout },
  { id: 'FiSettings', label: ['Settings', 'Gear', 'Config', 'Preferences'], component: FiSettings },
  { id: 'FiTool', label: ['Tool', 'Wrench', 'Repair', 'Build', 'DevOps'], component: FiTool },

  // Content & Links
  { id: 'FiLink', label: ['Link', 'URL', 'Chain', 'Connection'], component: FiLink },
  {
    id: 'FiExternalLink',
    label: ['External Link', 'Open', 'Redirect', 'URL'],
    component: FiExternalLink
  },
  { id: 'FiFileText', label: ['Document', 'Resume', 'CV', 'Paper', 'Text'], component: FiFileText },
  { id: 'FiFile', label: ['File', 'Attachment', 'Document'], component: FiFile },
  { id: 'FiFolder', label: ['Folder', 'Directory', 'Project', 'Collection'], component: FiFolder },
  { id: 'FiClipboard', label: ['Clipboard', 'Copy', 'Paste', 'Notes'], component: FiClipboard },
  {
    id: 'FiBookOpen',
    label: ['Book Open', 'Education', 'Study', 'Learning', 'Course'],
    component: FiBookOpen
  },
  { id: 'FiBook', label: ['Book', 'Library', 'Reading', 'Knowledge'], component: FiBook },
  {
    id: 'FiBookmark',
    label: ['Bookmark', 'Save', 'Favorite', 'Read Later'],
    component: FiBookmark
  },
  { id: 'FiHash', label: ['Hash', 'Number', 'Tag', 'ID', 'Channel'], component: FiHash },
  { id: 'FiTag', label: ['Tag', 'Label', 'Category', 'Keyword'], component: FiTag },
  { id: 'FiType', label: ['Typography', 'Font', 'Text', 'Writing'], component: FiType },
  { id: 'FiImage', label: ['Image', 'Photo', 'Picture', 'Gallery'], component: FiImage },
  { id: 'FiCamera', label: ['Camera', 'Photo', 'Capture', 'Snap'], component: FiCamera },
  { id: 'FiPenTool', label: ['Pen', 'Design', 'Draw', 'Illustrate', 'Blog'], component: FiPenTool },
  { id: 'FiEdit3', label: ['Edit', 'Write', 'Compose', 'Pencil'], component: FiEdit3 },
  { id: 'FiFeather', label: ['Feather', 'Write', 'Author', 'Light'], component: FiFeather },
  {
    id: 'FiPaperclip',
    label: ['Paperclip', 'Attachment', 'Attach', 'Clip'],
    component: FiPaperclip
  },
  { id: 'FiDownload', label: ['Download', 'Save', 'Export'], component: FiDownload },
  { id: 'FiUpload', label: ['Upload', 'Import', 'Publish'], component: FiUpload },
  { id: 'FiPrinter', label: ['Printer', 'Print', 'Output'], component: FiPrinter },
  { id: 'FiShare2', label: ['Share', 'Social', 'Forward'], component: FiShare2 },
  { id: 'FiEye', label: ['Eye', 'View', 'Visibility', 'Watch'], component: FiEye },

  // Misc
  { id: 'FiHeart', label: ['Heart', 'Love', 'Like', 'Favorite', 'Health'], component: FiHeart },
  { id: 'FiThumbsUp', label: ['Thumbs Up', 'Like', 'Approve', 'Good'], component: FiThumbsUp },
  {
    id: 'FiCheckCircle',
    label: ['Check', 'Done', 'Complete', 'Verified', 'Success'],
    component: FiCheckCircle
  },
  { id: 'FiCoffee', label: ['Coffee', 'Break', 'Cafe', 'Drink'], component: FiCoffee },
  { id: 'FiGift', label: ['Gift', 'Present', 'Reward', 'Bonus'], component: FiGift },
  { id: 'FiAnchor', label: ['Anchor', 'Port', 'Marine', 'Stable'], component: FiAnchor },
  { id: 'FiShield', label: ['Shield', 'Security', 'Protection', 'Privacy'], component: FiShield },
  { id: 'FiKey', label: ['Key', 'Password', 'Access', 'Auth', 'Credential'], component: FiKey },
  { id: 'FiLock', label: ['Lock', 'Security', 'Private', 'Protected'], component: FiLock },
  { id: 'FiLifeBuoy', label: ['Life Buoy', 'Help', 'Support', 'Rescue'], component: FiLifeBuoy },
  { id: 'FiSun', label: ['Sun', 'Light', 'Day', 'Bright', 'Weather'], component: FiSun },
  { id: 'FiMusic', label: ['Music', 'Audio', 'Song', 'Sound'], component: FiMusic },
  {
    id: 'FiHeadphones',
    label: ['Headphones', 'Audio', 'Music', 'Listen', 'Podcast'],
    component: FiHeadphones
  },
  { id: 'FiTv', label: ['TV', 'Television', 'Screen', 'Media', 'Stream'], component: FiTv },
  { id: 'FiDisc', label: ['Disc', 'CD', 'Record', 'Vinyl'], component: FiDisc },
  { id: 'FiBox', label: ['Box', 'Package', 'Container', 'Product'], component: FiBox },
  { id: 'FiPocket', label: ['Pocket', 'Save', 'Read Later'], component: FiPocket },

  // Brand / Social
  { id: 'FaLinkedin', label: ['LinkedIn', 'Professional', 'Network'], component: FaLinkedin },
  { id: 'SiGithub', label: ['GitHub', 'Code', 'Repository', 'Open Source'], component: SiGithub },
  { id: 'FaTwitter', label: ['Twitter', 'X', 'Tweet', 'Social'], component: FaTwitter },
  { id: 'SiDribbble', label: ['Dribbble', 'Design', 'Portfolio'], component: SiDribbble },
  { id: 'SiBehance', label: ['Behance', 'Design', 'Portfolio', 'Creative'], component: SiBehance },
  { id: 'SiMedium', label: ['Medium', 'Blog', 'Article', 'Writing'], component: SiMedium },
  {
    id: 'SiStackoverflow',
    label: ['Stack Overflow', 'Q&A', 'Developer', 'Forum'],
    component: SiStackoverflow
  },
  { id: 'SiYoutube', label: ['YouTube', 'Video', 'Channel', 'Stream'], component: SiYoutube },
  { id: 'SiNotion', label: ['Notion', 'Notes', 'Wiki', 'Workspace'], component: SiNotion },
  { id: 'SiFigma', label: ['Figma', 'Design', 'UI', 'Prototype'], component: SiFigma },
  { id: 'SiDiscord', label: ['Discord', 'Chat', 'Community', 'Server'], component: SiDiscord },
  { id: 'SiTelegram', label: ['Telegram', 'Chat', 'Messaging'], component: SiTelegram },
  { id: 'SiReddit', label: ['Reddit', 'Forum', 'Community'], component: SiReddit },
  { id: 'SiInstagram', label: ['Instagram', 'Photo', 'Social', 'Reels'], component: SiInstagram },
  { id: 'SiFacebook', label: ['Facebook', 'Social', 'Meta'], component: SiFacebook },
  { id: 'SiSpotify', label: ['Spotify', 'Music', 'Podcast', 'Audio'], component: SiSpotify },
  { id: 'SiGoogle', label: ['Google', 'Search', 'GCP', 'Gmail'], component: SiGoogle },

  // Dev Brands
  { id: 'SiReact', label: ['React', 'Frontend', 'JavaScript', 'Component'], component: SiReact },
  {
    id: 'SiTypescript',
    label: ['TypeScript', 'TS', 'JavaScript', 'Typed'],
    component: SiTypescript
  },
  { id: 'SiPython', label: ['Python', 'ML', 'Data Science', 'Backend'], component: SiPython },
  {
    id: 'SiNodedotjs',
    label: ['Node.js', 'Backend', 'JavaScript', 'Server'],
    component: SiNodedotjs
  },
  { id: 'SiDocker', label: ['Docker', 'Container', 'DevOps', 'Deploy'], component: SiDocker },
  { id: 'SiFirebase', label: ['Firebase', 'Google', 'Backend', 'Realtime'], component: SiFirebase },
  { id: 'SiVercel', label: ['Vercel', 'Deploy', 'Hosting', 'Next.js'], component: SiVercel },
  { id: 'SiGitlab', label: ['GitLab', 'CI/CD', 'Repository', 'DevOps'], component: SiGitlab },
  {
    id: 'SiBitbucket',
    label: ['Bitbucket', 'Git', 'Repository', 'Atlassian'],
    component: SiBitbucket
  },
  { id: 'SiNpm', label: ['npm', 'Package', 'Registry', 'Node'], component: SiNpm },
  {
    id: 'SiTailwindcss',
    label: ['Tailwind', 'CSS', 'Styling', 'Utility'],
    component: SiTailwindcss
  },
  {
    id: 'SiPostgresql',
    label: ['PostgreSQL', 'Database', 'SQL', 'Postgres'],
    component: SiPostgresql
  },
  { id: 'SiMongodb', label: ['MongoDB', 'Database', 'NoSQL', 'Document'], component: SiMongodb },
  { id: 'SiAngular', label: ['Angular', 'Frontend', 'Google', 'TypeScript'], component: SiAngular },
  { id: 'SiNextdotjs', label: ['Next.js', 'React', 'Framework', 'SSR'], component: SiNextdotjs },
  { id: 'SiNetlify', label: ['Netlify', 'Deploy', 'Hosting', 'JAMstack'], component: SiNetlify }
]

const iconLookup = new Map(ICON_REGISTRY.map((entry) => [entry.id, entry]))

export function getIconEntry(iconId: string): IconEntry | undefined {
  return iconLookup.get(iconId)
}

/** Maps common field keys to a default icon ID. */
export const DEFAULT_ICON_MAP: Record<string, string> = {
  first_name: 'FiUser',
  middle_name: 'FiUser',
  last_name: 'FiUser',
  full_name: 'FiUser',
  name: 'FiUser',
  email: 'FiMail',
  phone: 'FiPhone',
  mobile: 'FiPhone',
  location: 'FiMapPin',
  city: 'FiMapPin',
  address: 'FiHome',
  linkedin: 'FaLinkedin',
  github: 'SiGithub',
  twitter: 'FaTwitter',
  portfolio: 'FiGlobe',
  website: 'FiGlobe',
  current_role: 'FiBriefcase',
  current_company: 'FiBriefcase',
  designation: 'FiBriefcase',
  experience: 'FiTrendingUp',
  total_experience: 'FiTrendingUp',
  years_experience: 'FiTrendingUp',
  notice_period: 'FiClock',
  current_ctc: 'FiDollarSign',
  expected_ctc: 'FiDollarSign',
  salary: 'FiDollarSign',
  education: 'FiBookOpen',
  degree: 'FiBookOpen',
  university: 'FiBookOpen',
  college: 'FiBookOpen',
  skills: 'FiCode',
  languages: 'FiGlobe',
  dribbble: 'SiDribbble',
  behance: 'SiBehance',
  medium: 'SiMedium',
  stackoverflow: 'SiStackoverflow',
  youtube: 'SiYoutube',
  blog: 'FiPenTool'
}

/** Returns the default icon ID for a given field key, or undefined. */
export function getDefaultIconForKey(fieldKey: string): string | undefined {
  return DEFAULT_ICON_MAP[fieldKey]
}
