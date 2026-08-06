import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { withShiori } from './components/ShioriRoute'
import { findShiori } from './lib/docs'
import { Contacts } from './pages/Contacts'
import { Costs } from './pages/Costs'
import { Cover } from './pages/Cover'
import { Home } from './pages/Home'
import { Items } from './pages/Items'
import { ManageHome, ManageHub } from './pages/Manage'
import { ManageEditBasic } from './pages/ManageEdit'
import { ManageContacts, ManageCosts, ManageItems, ManageUpdates } from './pages/ManageLists'
import { ManageMembers } from './pages/ManageMembers'
import { ManageSchedule } from './pages/ManageSchedule'
import { Print } from './pages/Print'
import { PublishDone, PublishPay, PublishPlan, Receipt } from './pages/Publish'
import { RsvpDone, RsvpForm, RsvpWho } from './pages/Rsvp'
import { Schedule } from './pages/Schedule'
import { ShareCard } from './pages/ShareCard'
import { Updates } from './pages/Updates'
import { NotFound } from './components/ShioriRoute'

const CoverR = withShiori(Cover)
const ScheduleR = withShiori(Schedule)
const ItemsR = withShiori(Items)
const ContactsR = withShiori(Contacts)
const CostsR = withShiori(Costs)
const RsvpWhoR = withShiori(RsvpWho)
const RsvpFormR = withShiori(RsvpForm)
const RsvpDoneR = withShiori(RsvpDone)
const PrintR = withShiori(Print)
const PublishPlanR = withShiori(PublishPlan)
const PublishPayR = withShiori(PublishPay)
const PublishDoneR = withShiori(PublishDone)
const ReceiptR = withShiori(Receipt)
const ShareCardR = withShiori(ShareCard)
const UpdatesR = withShiori(Updates)
const ManageHubR = withShiori(ManageHub)
const ManageEditBasicR = withShiori(ManageEditBasic)
const ManageScheduleR = withShiori(ManageSchedule)
const ManageMembersR = withShiori(ManageMembers)
const ManageItemsR = withShiori(ManageItems)
const ManageContactsR = withShiori(ManageContacts)
const ManageUpdatesR = withShiori(ManageUpdates)
const ManageCostsR = withShiori(ManageCosts)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const SECTION_TITLES: Record<string, string> = {
  schedule: '行程',
  items: '持ち物',
  contacts: '連絡先',
  costs: '費用と予約',
  rsvp: '出欠のご回答',
  print: '印刷',
  card: '共有カード',
  updates: 'お知らせ',
}

/** ルートに応じて document.title を設定する */
function TitleManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    let title = '旅のしおり'
    const m = pathname.match(/^\/(s|publish|manage)\/([^/]+)(?:\/([^/]+))?/)
    if (pathname === '/manage') {
      title = '幹事メニュー | 旅のしおり'
    } else if (m) {
      const shiori = findShiori(m[2])
      if (shiori) {
        const section =
          m[1] === 'publish'
            ? '公開・お支払い'
            : m[1] === 'manage'
              ? '管理'
              : SECTION_TITLES[m[3] ?? '']
        title = section
          ? `${section} | ${shiori.title}`
          : `${shiori.title} ${shiori.subtitle} | 旅のしおり`
      }
    }
    document.title = title
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <TitleManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:slug" element={<CoverR />} />
        <Route path="/s/:slug/schedule" element={<ScheduleR />} />
        <Route path="/s/:slug/items" element={<ItemsR />} />
        <Route path="/s/:slug/contacts" element={<ContactsR />} />
        <Route path="/s/:slug/costs" element={<CostsR />} />
        <Route path="/s/:slug/rsvp/who" element={<RsvpWhoR />} />
        <Route path="/s/:slug/rsvp" element={<RsvpFormR />} />
        <Route path="/s/:slug/rsvp/done" element={<RsvpDoneR />} />
        <Route path="/s/:slug/print" element={<PrintR />} />
        <Route path="/s/:slug/card" element={<ShareCardR />} />
        <Route path="/s/:slug/updates" element={<UpdatesR />} />
        <Route path="/publish/:slug" element={<PublishPlanR />} />
        <Route path="/publish/:slug/pay" element={<PublishPayR />} />
        <Route path="/publish/:slug/done" element={<PublishDoneR />} />
        <Route path="/publish/:slug/receipt" element={<ReceiptR />} />
        <Route path="/manage" element={<ManageHome />} />
        <Route path="/manage/:slug" element={<ManageHubR />} />
        <Route path="/manage/:slug/edit" element={<ManageEditBasicR />} />
        <Route path="/manage/:slug/schedule" element={<ManageScheduleR />} />
        <Route path="/manage/:slug/members" element={<ManageMembersR />} />
        <Route path="/manage/:slug/items" element={<ManageItemsR />} />
        <Route path="/manage/:slug/contacts" element={<ManageContactsR />} />
        <Route path="/manage/:slug/updates" element={<ManageUpdatesR />} />
        <Route path="/manage/:slug/costs" element={<ManageCostsR />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
