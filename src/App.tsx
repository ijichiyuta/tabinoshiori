import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { withManagedShiori, withShiori } from './components/ShioriRoute'
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
import { ManageBoarding, ManageCheckin, ManageNotices, ManageSurveyResults } from './pages/ManageTour'
import { ManageLinks } from './pages/ManageLinks'
import { Notices } from './pages/Notices'
import { SurveyPage } from './pages/Survey'
import { Print } from './pages/Print'
import { PublishDone, PublishPay, PublishPlan, PublishStripeReturn, Receipt } from './pages/Publish'
import { RsvpDone, RsvpForm, RsvpWho } from './pages/Rsvp'
import { Schedule } from './pages/Schedule'
import { ShareCard } from './pages/ShareCard'
import { Updates } from './pages/Updates'
import { Privacy, Terms, Tokushoho } from './pages/Legal'
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
const PublishPlanR = withManagedShiori(PublishPlan)
const PublishPayR = withManagedShiori(PublishPay)
const PublishDoneR = withManagedShiori(PublishDone)
const ReceiptR = withManagedShiori(Receipt)
const PublishStripeR = withShiori(PublishStripeReturn)
const ShareCardR = withShiori(ShareCard)
const UpdatesR = withShiori(Updates)
const ManageHubR = withManagedShiori(ManageHub)
const ManageEditBasicR = withManagedShiori(ManageEditBasic)
const ManageScheduleR = withManagedShiori(ManageSchedule)
const ManageMembersR = withManagedShiori(ManageMembers)
const ManageItemsR = withManagedShiori(ManageItems)
const ManageContactsR = withManagedShiori(ManageContacts)
const ManageUpdatesR = withManagedShiori(ManageUpdates)
const ManageCostsR = withManagedShiori(ManageCosts)
const NoticesR = withShiori(Notices)
const SurveyR = withShiori(SurveyPage)
const ManageBoardingR = withManagedShiori(ManageBoarding)
const ManageNoticesR = withManagedShiori(ManageNotices)
const ManageCheckinR = withManagedShiori(ManageCheckin)
const ManageSurveyR = withManagedShiori(ManageSurveyResults)
const ManageLinksR = withManagedShiori(ManageLinks)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    // PC表示ではしおり(.app)が内部スクロールになるため、そちらもリセット
    document.querySelector('.app')?.scrollTo(0, 0)
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
  notices: 'ご案内',
  survey: 'アンケート',
}

/** ルートに応じて document.title を設定する */
function TitleManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    let title = '旅合わせ'
    const m = pathname.match(/^\/(s|publish|manage)\/([^/]+)(?:\/([^/]+))?/)
    if (pathname === '/manage') {
      title = 'しおり管理 | 旅合わせ'
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
          : `${shiori.title} ${shiori.subtitle} | 旅合わせ`
      }
    }
    document.title = title
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
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
        <Route path="/s/:slug/notices" element={<NoticesR />} />
        <Route path="/s/:slug/survey" element={<SurveyR />} />
        <Route path="/publish/:slug" element={<PublishPlanR />} />
        <Route path="/publish/:slug/pay" element={<PublishPayR />} />
        <Route path="/publish/:slug/done" element={<PublishDoneR />} />
        <Route path="/publish/:slug/receipt" element={<ReceiptR />} />
        <Route path="/publish/:slug/stripe" element={<PublishStripeR />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/tokushoho" element={<Tokushoho />} />
        <Route path="/manage" element={<ManageHome />} />
        <Route path="/manage/:slug" element={<ManageHubR />} />
        <Route path="/manage/:slug/edit" element={<ManageEditBasicR />} />
        <Route path="/manage/:slug/schedule" element={<ManageScheduleR />} />
        <Route path="/manage/:slug/members" element={<ManageMembersR />} />
        <Route path="/manage/:slug/items" element={<ManageItemsR />} />
        <Route path="/manage/:slug/contacts" element={<ManageContactsR />} />
        <Route path="/manage/:slug/updates" element={<ManageUpdatesR />} />
        <Route path="/manage/:slug/costs" element={<ManageCostsR />} />
        <Route path="/manage/:slug/boarding" element={<ManageBoardingR />} />
        <Route path="/manage/:slug/notices" element={<ManageNoticesR />} />
        <Route path="/manage/:slug/checkin" element={<ManageCheckinR />} />
        <Route path="/manage/:slug/survey" element={<ManageSurveyR />} />
        <Route path="/manage/:slug/links" element={<ManageLinksR />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}
