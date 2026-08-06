import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { withShiori } from './components/ShioriRoute'
import { Contacts } from './pages/Contacts'
import { Costs } from './pages/Costs'
import { Cover } from './pages/Cover'
import { Home } from './pages/Home'
import { Items } from './pages/Items'
import { Print } from './pages/Print'
import { PublishDone, PublishPay, PublishPlan, Receipt } from './pages/Publish'
import { RsvpDone, RsvpForm, RsvpWho } from './pages/Rsvp'
import { Schedule } from './pages/Schedule'
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
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
        <Route path="/publish/:slug" element={<PublishPlanR />} />
        <Route path="/publish/:slug/pay" element={<PublishPayR />} />
        <Route path="/publish/:slug/done" element={<PublishDoneR />} />
        <Route path="/publish/:slug/receipt" element={<ReceiptR />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
