"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { BRAND } from "./brand";

export type Lang = "en" | "ar";

const DICT = {
  en: {
    "app.name": BRAND.name,
    "app.tagline": "Sourcing tracker",

    "nav.dashboard": "Dashboard",
    "nav.sourcing": "To source",
    "nav.requests": "Requests",
    "nav.clients": "Clients",
    "nav.settings": "Settings",

    "req.title": "Tell us what you're looking for",
    "req.intro":
      "Send us the piece you want and we'll try to source it on our next trip. We'll message you on WhatsApp with the price before anything is bought.",
    "req.name": "Your name",
    "req.phone": "WhatsApp number",
    "req.phoneHint": "So we can reach you about this request.",
    "req.what": "What are you looking for?",
    "req.whatHint": "The more detail the better — brand, colour, style.",
    "req.specs": "Size / colour / brand",
    "req.budget": "Your budget",
    "req.photo": "Photo",
    "req.photoAdd": "Add a photo",
    "req.photoHint": "A screenshot or picture helps us find exactly the right thing.",
    "req.photoError": "Could not upload that photo. You can send it later instead.",
    "req.send": "Send request",
    "req.sending": "Sending…",
    "req.failed": "Could not send. Please check your connection and try again.",
    "req.thanks": "Thank you 🤍",
    "req.thanksBody":
      "We've received your request. We'll message you on WhatsApp once we've had a look.",

    "req.address": "Delivery address",
    "req.addressHint": "Where we should bring the order. Area, street, building, floor.",

    "req.map": "Pin the location",
    "req.mapHint":
      "Optional, but it saves a phone call. Tap the button while you're at the address, or paste the location link you'd send on WhatsApp.",
    "req.mapUse": "Use my current location",
    "req.mapLocating": "Finding you…",
    "req.mapPinned": "Location pinned",
    "req.mapCheck": "Check the pin",
    "req.mapClear": "Remove",
    "req.mapOr": "or paste a link",
    "req.mapDenied":
      "Your phone didn't share the location. You can paste a map link instead.",
    "req.mapBad": "That doesn't look like a map link — Google Maps, Apple Maps or Waze.",

    "req.itemsTitle": "What you're looking for",
    "req.itemN": "Item {n}",
    "req.addItem": "+ Add another item",
    "req.removeItem": "Remove",
    "req.maxItems": "That's ten items — send this one and start another if you need more.",

    "req.errFlood": "That's a lot of requests from this number. Message us on Instagram instead.",

    "req.inbox": "Requests",
    "req.empty": "No new requests.",
    "req.emptyAll": "No requests yet. Share your link to start receiving them.",
    "req.showAll": "Show all",
    "req.showPending": "Show new only",
    "req.approve": "Approve",
    "req.reject": "Reject",
    "req.rejectConfirm": "Reject this request? It stays in your list but creates nothing.",
    "req.approved": "Approved",
    "req.rejected": "Rejected",
    "req.openClient": "Open client",
    "req.match": "This may be someone you already have",
    "req.matchHint": "Same name or a similar number. Add the order to them, or start a new client?",
    "req.attach": "Add to",
    "req.createNew": "Create a new client",
    "req.approvedNotify": "Approved. Let them know?",
    "req.reqAddress": "Address",
    "req.noAddress": "No address given",
    "req.openMap": "Open in Maps",
    "req.itemCount": "{n} items",
    "req.link": "Your request link",
    "req.linkHint":
      "Put this in your Instagram bio. Anyone can send a request; nothing is created until you approve it.",

    "sourcing.title": "To source",
    "sourcing.empty": "Nothing to source right now.",
    "sourcing.noPhoto": "no photo",
    "sourcing.open": "Open",
    "sourcing.undo": "Undo",
    "sourcing.hint":
      "Everything still Requested or Sourcing, oldest first. Marked items stay until you reload, so a wrong tap can be undone.",
    "nav.logout": "Log out",

    "settings.title": "Settings",
    "settings.payment": "How clients pay you",
    "settings.paymentHint":
      "This appears on every client's page when they still owe money. Put your Whish / OMT number, bank details, or anything else they need.",
    "settings.method": "Payment method",
    "settings.methodHint": "Whish, OMT, bank…",
    "settings.account": "Account number",
    "settings.accountName": "Account is under the name",
    "settings.whatsapp": "Your WhatsApp number",
    "settings.whatsappHint": "Used for the “I've sent the payment” button.",
    "settings.en": "Message in English",
    "settings.ar": "Message in Arabic",
    "settings.placeholderEn":
      `Please pay through Whish to account number **2584-123**, under the name ${BRAND.name}.`,
    "settings.placeholderAr": `يرجى الدفع عبر Whish إلى الحساب **2584-123** باسم ${BRAND.name}.`,
    "settings.bold": "Wrap text in **two stars** to make it bold.",
    "settings.saved": "Saved",
    "settings.preview": "This is what your client sees:",
    "settings.preview2": "Preview the form",

    "settings.rates": "Buying rates",
    "settings.ratesHint":
      "Where the cost field starts when you buy in euros or riyals. Each item keeps the rate you saved it with, so changing these never alters an old order.",
    "settings.rateEur": "1 euro in dollars",
    "settings.rateSar": "1 riyal in dollars",
    "settings.rateSarHint": "Pegged at 3.75 to the dollar.",

    "settings.password": "Your password",
    "settings.passwordHint":
      "This is the password for /admin. Only you know it — change it here whenever you like. You stay signed in afterwards.",
    "settings.pwCurrent": "Current password",
    "settings.pwNew": "New password",
    "settings.pwRepeat": "Repeat new password",
    "settings.pwRule": "At least 8 characters.",
    "settings.pwChange": "Change password",
    "settings.pwDone": "Password changed ✓",
    "settings.pwShort": "Use at least 8 characters.",
    "settings.pwMismatch": "The two new passwords are not the same.",
    "settings.pwWrong": "That current password is not right.",
    "settings.pwFailed": "Could not change the password. Sign out, sign in again, and retry.",

    "login.title": "Sign in",
    "login.subtitle": "Owner access only",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.working": "Signing in…",
    "login.failed": "Wrong email or password.",
    "login.hint":
      "In Supabase: Authentication → Users → Add user → Create new user, with “Auto Confirm User” ticked.",

    "dash.title": "Dashboard",
    "dash.from": "From",
    "dash.to": "To",
    "dash.clear": "All time",
    "dash.clearAll": "Clear filters",
    "dash.allStatuses": "All statuses",
    "dash.tapStatus": "Tap a status to filter the report by it.",

    "report.export": "Export report",
    "report.exportHint":
      "Exports exactly what the filters above are showing — dates and status included.",
    "report.excel": "Download Excel",
    "report.pdf": "Save as PDF",
    "report.title": "Order report",
    "report.range": "Period",
    "report.generated": "Generated",
    "report.date": "Date",
    "report.confidential": "Internal report — contains cost and profit. Not for clients.",
    "dash.billed": "Total billed",
    "dash.cost": "Total cost",
    "dash.profit": "Profit",
    "dash.deposits": "Deposits collected",
    "dash.balance": "Balance outstanding",
    "dash.items": "Items",
    "dash.byStatus": "By status",
    "dash.private": "Only you can see cost and profit.",

    "clients.title": "Clients",
    "clients.add": "Add client",
    "clients.search": "Search clients or items",
    "clients.searchHint": "Try a name, a phone number, or what someone asked for — \"42\", \"loafers\".",
    "clients.matchingItems": "Matching items",
    "clients.name": "Name",
    "clients.phone": "Phone (with country code)",
    "clients.note": "Private note",
    "clients.empty": "No clients yet. Add your first one.",
    "clients.noMatch": "Nothing matches that search.",
    "clients.count": "clients",

    "client.items": "items",
    "client.billed": "Billed",
    "client.due": "Due",
    "client.credit": "Owed back",
    "client.link": "Client link",
    "client.copy": "Copy link",
    "client.copied": "Copied",
    "client.copyFailed": "Could not copy. Select the link above and copy it by hand.",
    "client.whatsapp": "Send on WhatsApp",
    "client.noPhone": "Add a phone number to send on WhatsApp.",
    "client.reset": "Reset link",
    "client.resetConfirm":
      "Create a new secret link? The old link will stop working immediately.",
    "client.merge": "Merge into another client",
    "client.mergeHint":
      "Moves every order from this client to the one you choose, then deletes this record. Use it to clean up a duplicate.",
    "client.mergePick": "Keep which client?",
    "client.mergeDo": "Merge",
    "client.mergeConfirm":
      "Move {n} orders to {name} and delete this client? This cannot be undone.",
    "client.delete": "Delete client",
    "client.deleteConfirm":
      "Delete this client and all their items? This cannot be undone.",
    "client.back": "Back to clients",
    "client.notFound": "Client not found.",
    "client.address": "Delivery address",
    "client.addressHint": "Comes from their request. Edit it here when they move.",
    "client.addressEmpty": "No address yet.",
    "client.map": "Pinned location",
    "client.mapEmpty": "No pin.",
    "client.mapPaste": "Paste a Google Maps, Apple Maps or Waze link.",

    "item.add": "Add item",
    "item.new": "New item",
    "item.edit": "Edit item",
    "item.description": "What they want",
    "item.descriptionHint": "e.g. white cotton T-shirt, plain",
    "item.specs": "Size / colour / brand",
    "item.budget": "Their budget",
    "item.status": "Status",
    "item.cost": "Your cost",
    "item.costHint": "Enter what you actually paid. Saved in dollars.",
    "item.costCurrency": "Currency paid in",
    "item.costRate": "1 {cur} in dollars",
    "item.costInUsd": "Saved as",
    "item.costPaid": "Paid {amount} at {rate}",
    "item.rateMissing": "Add the rate, or switch the cost back to dollars.",
    "item.price": "Price for client",
    "item.deposit": "Deposit paid",
    "item.note": "Private note",
    "item.empty": "No items yet for this client.",
    "item.allClosed": "Nothing open. Past orders are in History below.",
    "item.history": "History",
    "item.historyHint": "Closed orders. The client does not see these on their link.",
    "item.deleteConfirm": "Delete this item?",
    "item.profit": "Profit",
    "item.hidden": "Hidden from client",
    "item.photoRequest": "Photo they sent",
    "item.photoRequestHint": "The picture from WhatsApp — only you see this.",
    "item.photoFound": "Photo of what you found",
    "item.photoFoundHint": "This one appears on the client's page.",
    "item.photoAdd": "Add photo",
    "item.photoChange": "Change",
    "item.photoRemove": "Remove",
    "item.photoUploading": "Uploading…",
    "item.photoError": "Could not upload that photo. Try again.",

    // WhatsApp messages sent when a status changes. {name} {item} {link}
    "msg.requested":
      "Hi {name}, I've noted your request: {item}. You can follow it here: {link}",
    "msg.sourcing": "Hi {name}, I'm looking for your {item} now. Follow it here: {link}",
    "msg.found": "Good news {name} — I found your {item}! Details here: {link}",
    "msg.bought": "Hi {name}, I've bought your {item} ✅ Details: {link}",
    "msg.shipped": "Hi {name}, your {item} has shipped 🎉 Follow it here: {link}",
    "msg.out_for_delivery": "Hi {name}, your {item} is out for delivery today 🚚 {link}",
    "msg.delivered": "Hi {name}, your {item} has been delivered. Thank you! {link}",
    "msg.closed": "Thank you {name} 🤍 Your order is complete. Looking forward to the next one!",
    "msg.canceled":
      "Hi {name}, unfortunately I couldn't source your {item}, so it has been canceled. Sorry about that.",
    "msg.approved":
      "Hi {name}, your request for {item} has been approved and is now being processed. You can follow it here: {link}",

    "item.notify": "Tell client",
    "item.statusChanged": "Status updated. Let them know?",
    "item.notifyHint": "Opens WhatsApp with the message written. You can edit it before sending.",

    "status.requested": "Requested",
    "status.sourcing": "Sourcing",
    "status.found": "Found",
    "status.bought": "Bought",
    "status.shipped": "Shipped",
    "status.out_for_delivery": "Out for delivery",
    "status.delivered": "Delivered",
    "status.closed": "Closed",
    "status.canceled": "Canceled",
    "item.statusHint":
      "Closed = finished and paid. It stays in your reports but disappears from the client's link.",
    "item.closeWithBalance":
      "This item still has an unpaid balance. Closing it hides it from the client's page. Close it anyway?",

    "pub.title": "Your order",
    "pub.hello": "Hello",
    "pub.total": "Total",
    "pub.paid": "Paid",
    "pub.due": "Balance due",
    "pub.empty": "Nothing here yet — your requests will show up as they come in.",
    "pub.notFound": "This link is not valid.",
    "pub.notFoundHint": "Ask for a new link.",
    "pub.budget": "Your budget",
    "pub.priceTbd": "Price not set yet",
    "pub.howToPay": "How to pay",
    "pub.account": "Account number",
    "pub.accountName": "Under the name",
    "pub.amountToSend": "Amount to send",
    "pub.copy": "Copy",
    "pub.copied": "Copied ✓",
    "pub.iPaid": "I've sent the payment",
    "pub.settled": "Paid in full",
    "pub.credit": "In your credit",
    "pub.photoFound": "What we found",
    "pub.photoRequest": "Your reference",

    "common.save": "Save",
    "common.saving": "Saving…",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.loading": "Loading…",
    "common.error": "Something went wrong. Try again.",
    "common.required": "Please fill in this field.",
    "common.optional": "optional",
    "common.private": "Private",
  },

  ar: {
    "app.name": BRAND.nameAr,
    "app.tagline": "متابعة الطلبات",

    "nav.dashboard": "لوحة التحكم",
    "nav.sourcing": "قائمة الشراء",
    "nav.requests": "الطلبات",
    "nav.clients": "الزبائن",
    "nav.settings": "الإعدادات",

    "req.title": "أخبرنا بما تبحث عنه",
    "req.intro":
      "أرسل لنا القطعة التي تريدها وسنحاول تأمينها في رحلتنا القادمة. سنتواصل معك عبر واتساب بالسعر قبل أي شراء.",
    "req.name": "الاسم",
    "req.phone": "رقم الواتساب",
    "req.phoneHint": "لنتمكن من التواصل معك بخصوص هذا الطلب.",
    "req.what": "ما الذي تبحث عنه؟",
    "req.whatHint": "كلما زادت التفاصيل كان أفضل — الماركة، اللون، الموديل.",
    "req.specs": "القياس / اللون / الماركة",
    "req.budget": "الميزانية",
    "req.photo": "صورة",
    "req.photoAdd": "إضافة صورة",
    "req.photoHint": "الصورة تساعدنا في إيجاد القطعة المناسبة تماماً.",
    "req.photoError": "تعذّر رفع الصورة. يمكنك إرسالها لاحقاً.",
    "req.send": "إرسال الطلب",
    "req.sending": "جارٍ الإرسال…",
    "req.failed": "تعذّر الإرسال. تحقق من الاتصال وحاول مجدداً.",
    "req.thanks": "شكراً لك 🤍",
    "req.thanksBody": "وصلنا طلبك. سنتواصل معك عبر واتساب بعد الاطلاع عليه.",

    "req.address": "عنوان التسليم",
    "req.addressHint": "المكان الذي يُسلَّم إليه الطلب: المنطقة، الشارع، المبنى، الطابق.",

    "req.map": "تحديد الموقع على الخريطة",
    "req.mapHint":
      "اختياري، لكنه يوفّر اتصالاً هاتفياً. يمكن استخدام الزر أثناء التواجد في مكان التسليم، أو لصق رابط الموقع الذي يُرسَل عادةً عبر واتساب.",
    "req.mapUse": "استخدام موقعي الحالي",
    "req.mapLocating": "جارٍ تحديد الموقع…",
    "req.mapPinned": "تم تحديد الموقع",
    "req.mapCheck": "عرض الموقع",
    "req.mapClear": "إزالة",
    "req.mapOr": "أو لصق رابط",
    "req.mapDenied": "لم يشارك الهاتف الموقع. يمكن لصق رابط خريطة بدلاً من ذلك.",
    "req.mapBad": "هذا لا يبدو رابط خريطة — خرائط Google أو Apple أو Waze.",

    "req.itemsTitle": "ما الذي تبحث عنه",
    "req.itemN": "القطعة {n}",
    "req.addItem": "+ إضافة قطعة أخرى",
    "req.removeItem": "حذف",
    "req.maxItems": "بلغت عشر قطع، وهو الحد الأقصى للطلب الواحد.",

    "req.errFlood": "عدد الطلبات من هذا الرقم كبير. يرجى التواصل عبر إنستغرام.",

    "req.inbox": "الطلبات",
    "req.empty": "لا توجد طلبات جديدة.",
    "req.emptyAll": "لا توجد طلبات بعد. شاركي رابطك لتبدأ بالوصول.",
    "req.showAll": "عرض الكل",
    "req.showPending": "الجديدة فقط",
    "req.approve": "قبول",
    "req.reject": "رفض",
    "req.rejectConfirm": "رفض هذا الطلب؟ يبقى في القائمة لكنه لا ينشئ شيئاً.",
    "req.approved": "مقبول",
    "req.rejected": "مرفوض",
    "req.openClient": "فتح صفحة الزبون",
    "req.match": "قد يكون هذا زبوناً موجوداً لديكِ",
    "req.matchHint": "الاسم نفسه أو رقم مشابه. هل تضيفين الطلب إليه أم تنشئين زبوناً جديداً؟",
    "req.attach": "أضيفي إلى",
    "req.createNew": "إنشاء زبون جديد",
    "req.approvedNotify": "تمت الموافقة. هل تريدين إبلاغه؟",
    "req.reqAddress": "العنوان",
    "req.noAddress": "لم يُذكر عنوان",
    "req.openMap": "فتح على الخريطة",
    "req.itemCount": "{n} قطع",
    "req.link": "رابط الطلبات",
    "req.linkHint":
      "ضعيه في وصف حسابك على إنستغرام. يمكن لأي شخص إرسال طلب، ولا يُنشأ شيء قبل موافقتك.",

    "sourcing.title": "قائمة الشراء",
    "sourcing.empty": "لا يوجد ما يجب شراؤه حالياً.",
    "sourcing.noPhoto": "بلا صورة",
    "sourcing.open": "فتح",
    "sourcing.undo": "تراجع",
    "sourcing.hint":
      "كل ما هو «مطلوبة» أو «قيد البحث»، الأقدم أولاً. القطع المؤشّرة تبقى ظاهرة حتى تحديث الصفحة، ليمكن التراجع عن أي ضغطة خاطئة.",
    "nav.logout": "تسجيل الخروج",

    "settings.title": "الإعدادات",
    "settings.payment": "طريقة الدفع",
    "settings.paymentHint":
      "يظهر هذا النص في صفحة كل زبون عليه مبلغ متبقٍ. اكتبي رقم Whish أو OMT أو تفاصيل الحساب المصرفي.",
    "settings.method": "طريقة الدفع",
    "settings.methodHint": "Whish أو OMT أو تحويل مصرفي…",
    "settings.account": "رقم الحساب",
    "settings.accountName": "الحساب باسم",
    "settings.whatsapp": "رقم الواتساب الخاص بكِ",
    "settings.whatsappHint": "يُستخدم لزر «لقد أرسلت المبلغ».",
    "settings.en": "الرسالة بالإنكليزية",
    "settings.ar": "الرسالة بالعربية",
    "settings.placeholderEn":
      `Please pay through Whish to account number **2584-123**, under the name ${BRAND.name}.`,
    "settings.placeholderAr": `يرجى الدفع عبر Whish إلى الحساب **2584-123** باسم ${BRAND.name}.`,
    "settings.bold": "ضعي النص بين **نجمتين** ليصبح عريضاً.",
    "settings.saved": "تم الحفظ",
    "settings.preview": "هذا ما يراه الزبون:",
    "settings.preview2": "معاينة النموذج",

    "settings.rates": "أسعار الشراء",
    "settings.ratesHint":
      "النقطة التي يبدأ منها حقل التكلفة عند الشراء باليورو أو بالريال. كل قطعة تحتفظ بالسعر الذي حُفظت به، لذا تعديل هذه الأرقام لا يغيّر أي طلب سابق.",
    "settings.rateEur": "قيمة اليورو بالدولار",
    "settings.rateSar": "قيمة الريال بالدولار",
    "settings.rateSarHint": "مثبّت على 3.75 للدولار.",

    "settings.password": "كلمة السر",
    "settings.passwordHint":
      "كلمة سر الدخول إلى /admin. أنتِ وحدك تعرفينها، ويمكنك تغييرها هنا متى شئتِ. يبقى الدخول قائماً بعد التغيير.",
    "settings.pwCurrent": "كلمة السر الحالية",
    "settings.pwNew": "كلمة السر الجديدة",
    "settings.pwRepeat": "أعيدي كتابة الجديدة",
    "settings.pwRule": "8 أحرف على الأقل.",
    "settings.pwChange": "تغيير كلمة السر",
    "settings.pwDone": "تم تغيير كلمة السر ✓",
    "settings.pwShort": "استخدمي 8 أحرف على الأقل.",
    "settings.pwMismatch": "كلمتا السر الجديدتان غير متطابقتين.",
    "settings.pwWrong": "كلمة السر الحالية غير صحيحة.",
    "settings.pwFailed": "تعذّر تغيير كلمة السر. سجّلي الخروج ثم الدخول وحاولي مجدداً.",


    "login.title": "تسجيل الدخول",
    "login.subtitle": "للمالكة فقط",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة السر",
    "login.submit": "دخول",
    "login.working": "جارٍ الدخول…",
    "login.failed": "البريد الإلكتروني أو كلمة السر غير صحيحة.",
    "login.hint":
      "في Supabase: Authentication ← Users ← Add user ← Create new user، مع تفعيل «Auto Confirm User».",

    "dash.title": "لوحة التحكم",
    "dash.from": "من",
    "dash.to": "إلى",
    "dash.clear": "كل الفترات",
    "dash.clearAll": "إزالة الفلاتر",
    "dash.allStatuses": "كل الحالات",
    "dash.tapStatus": "اضغطي على حالة لتصفية التقرير حسبها.",

    "report.export": "تصدير التقرير",
    "report.exportHint": "يصدّر ما تعرضه الفلاتر أعلاه تماماً، بالتاريخ والحالة.",
    "report.excel": "تنزيل Excel",
    "report.pdf": "حفظ كـ PDF",
    "report.title": "تقرير الطلبات",
    "report.range": "الفترة",
    "report.generated": "تاريخ الإصدار",
    "report.date": "التاريخ",
    "report.confidential": "تقرير داخلي — يحتوي التكلفة والربح. غير مخصص للزبائن.",
    "dash.billed": "إجمالي المبيعات",
    "dash.cost": "إجمالي التكلفة",
    "dash.profit": "الربح",
    "dash.deposits": "العرابين المقبوضة",
    "dash.balance": "المبلغ المتبقي",
    "dash.items": "القطع",
    "dash.byStatus": "حسب الحالة",
    "dash.private": "التكلفة والربح تظهر لكِ وحدك.",

    "clients.title": "الزبائن",
    "clients.add": "إضافة زبون",
    "clients.search": "ابحثي عن زبون أو قطعة",
    "clients.searchHint": "جرّبي اسماً أو رقم هاتف أو ما طلبه أحدهم — «42» أو «حذاء».",
    "clients.matchingItems": "القطع المطابقة",
    "clients.name": "الاسم",
    "clients.phone": "الهاتف (مع رمز الدولة)",
    "clients.note": "ملاحظة خاصة",
    "clients.empty": "لا يوجد زبائن بعد. أضيفي أول زبون.",
    "clients.noMatch": "لا يوجد أي نتيجة مطابقة للبحث.",
    "clients.count": "زبون",

    "client.items": "قطعة",
    "client.billed": "الإجمالي",
    "client.due": "المتبقي",
    "client.credit": "مستحق للزبون",
    "client.link": "رابط الزبون",
    "client.copy": "نسخ الرابط",
    "client.copied": "تم النسخ",
    "client.copyFailed": "تعذّر النسخ. حدّدي الرابط أعلاه وانسخيه يدوياً.",
    "client.whatsapp": "إرسال عبر واتساب",
    "client.noPhone": "أضيفي رقم هاتف لإرسال الرابط عبر واتساب.",
    "client.reset": "تغيير الرابط",
    "client.resetConfirm": "إنشاء رابط سري جديد؟ الرابط القديم يتوقف فوراً.",
    "client.merge": "دمج مع زبون آخر",
    "client.mergeHint":
      "ينقل كل الطلبات من هذا الزبون إلى الزبون الذي تختارينه، ثم يحذف هذا السجل. استخدميه لإزالة التكرار.",
    "client.mergePick": "أي زبون تريدين الإبقاء عليه؟",
    "client.mergeDo": "دمج",
    "client.mergeConfirm": "نقل {n} طلبات إلى {name} وحذف هذا الزبون؟ لا يمكن التراجع.",
    "client.delete": "حذف الزبون",
    "client.deleteConfirm": "حذف هذا الزبون وكل قطعه؟ لا يمكن التراجع.",
    "client.back": "العودة إلى الزبائن",
    "client.notFound": "الزبون غير موجود.",
    "client.address": "عنوان التسليم",
    "client.addressHint": "يأتي من طلبه. يمكنك تعديله هنا عند تغيّر العنوان.",
    "client.addressEmpty": "لا يوجد عنوان بعد.",
    "client.map": "الموقع على الخريطة",
    "client.mapEmpty": "لا يوجد موقع.",
    "client.mapPaste": "يمكنك لصق رابط خرائط Google أو Apple أو Waze.",

    "item.add": "إضافة قطعة",
    "item.new": "قطعة جديدة",
    "item.edit": "تعديل القطعة",
    "item.description": "المطلوب",
    "item.descriptionHint": "مثال: تي شيرت قطن أبيض سادة",
    "item.specs": "القياس / اللون / الماركة",
    "item.budget": "ميزانية الزبون",
    "item.status": "الحالة",
    "item.cost": "التكلفة عليكِ",
    "item.costHint": "أدخلي المبلغ الذي دفعتِه فعلاً. يُحفظ بالدولار.",
    "item.costCurrency": "عملة الشراء",
    "item.costRate": "قيمة 1 {cur} بالدولار",
    "item.costInUsd": "يُحفظ كـ",
    "item.costPaid": "دُفع {amount} بسعر {rate}",
    "item.rateMissing": "أضيفي سعر الصرف، أو أعيدي التكلفة إلى الدولار.",
    "item.price": "السعر للزبون",
    "item.deposit": "العربون المدفوع",
    "item.note": "ملاحظة خاصة",
    "item.empty": "لا توجد قطع لهذا الزبون بعد.",
    "item.allClosed": "لا يوجد طلب مفتوح. الطلبات السابقة في «السجل» أدناه.",
    "item.history": "السجل",
    "item.historyHint": "الطلبات المغلقة. لا تظهر للزبون في رابطه.",
    "item.deleteConfirm": "حذف هذه القطعة؟",
    "item.profit": "الربح",
    "item.hidden": "لا يظهر للزبون",
    "item.photoRequest": "الصورة التي أرسلها الزبون",
    "item.photoRequestHint": "صورة الواتساب — تظهر لكِ وحدك.",
    "item.photoFound": "صورة القطعة التي وجدتِها",
    "item.photoFoundHint": "هذه الصورة تظهر في صفحة الزبون.",
    "item.photoAdd": "إضافة صورة",
    "item.photoChange": "تغيير",
    "item.photoRemove": "حذف",
    "item.photoUploading": "جارٍ الرفع…",
    "item.photoError": "تعذّر رفع الصورة. حاولي مرة أخرى.",

    // صياغة محايدة، لأن جنس الزبون غير معروف
    "msg.requested": "مرحباً {name}، تم تسجيل طلبك: {item}. رابط المتابعة: {link}",
    "msg.sourcing": "مرحباً {name}، جارٍ البحث عن {item}. رابط المتابعة: {link}",
    "msg.found": "خبر جميل {name} — تم إيجاد {item}! التفاصيل: {link}",
    "msg.bought": "مرحباً {name}، تم شراء {item} ✅ التفاصيل: {link}",
    "msg.shipped": "مرحباً {name}، تم شحن {item} 🎉 رابط المتابعة: {link}",
    "msg.out_for_delivery": "مرحباً {name}، {item} قيد التوصيل اليوم 🚚 {link}",
    "msg.delivered": "مرحباً {name}، تم تسليم {item}. شكراً جزيلاً! {link}",
    "msg.closed": "شكراً {name} 🤍 اكتمل الطلب. بانتظارك في المرة القادمة!",
    "msg.canceled": "مرحباً {name}، للأسف تعذّر تأمين {item} وتم إلغاء الطلب. نعتذر.",
    "msg.approved":
      "مرحباً {name}، تمت الموافقة على طلبك: {item}، وهو الآن قيد التنفيذ. رابط المتابعة: {link}",

    "item.notify": "إبلاغ الزبون",
    "item.statusChanged": "تم تحديث الحالة. هل تريدين إبلاغه؟",
    "item.notifyHint": "يفتح واتساب والرسالة جاهزة. يمكنكِ تعديلها قبل الإرسال.",

    "status.requested": "مطلوبة",
    "status.sourcing": "قيد البحث",
    "status.found": "تم إيجادها",
    "status.bought": "تم شراؤها",
    "status.shipped": "تم الشحن",
    "status.out_for_delivery": "قيد التوصيل",
    "status.delivered": "تم التسليم",
    "status.closed": "مغلقة",
    "status.canceled": "ملغاة",
    "item.statusHint":
      "«مغلقة» تعني مُنجزة ومدفوعة. تبقى في تقاريرك لكنها تختفي من رابط الزبون.",
    "item.closeWithBalance":
      "لا يزال على هذه القطعة مبلغ غير مدفوع. إغلاقها يخفيها من صفحة الزبون. هل تريدين الإغلاق؟",

    "pub.title": "طلبك",
    "pub.hello": "مرحباً",
    "pub.total": "الإجمالي",
    "pub.paid": "المدفوع",
    "pub.due": "المتبقي",
    "pub.empty": "لا يوجد شيء بعد — ستظهر طلباتك هنا أولاً بأول.",
    "pub.notFound": "هذا الرابط غير صالح.",
    "pub.notFoundHint": "اطلبي رابطاً جديداً.",
    "pub.budget": "ميزانيتك",
    "pub.priceTbd": "السعر لم يُحدَّد بعد",
    "pub.howToPay": "طريقة الدفع",
    "pub.account": "رقم الحساب",
    "pub.accountName": "باسم",
    "pub.amountToSend": "المبلغ المطلوب",
    "pub.copy": "نسخ",
    "pub.copied": "تم النسخ ✓",
    "pub.iPaid": "لقد أرسلت المبلغ",
    "pub.settled": "مدفوع بالكامل",
    "pub.credit": "رصيد لكِ",
    "pub.photoFound": "ما وجدناه",
    "pub.photoRequest": "صورتك المرجعية",

    "common.save": "حفظ",
    "common.saving": "جارٍ الحفظ…",
    "common.cancel": "إلغاء",
    "common.edit": "تعديل",
    "common.delete": "حذف",
    "common.loading": "جارٍ التحميل…",
    "common.error": "حدث خطأ. حاولي مرة أخرى.",
    "common.required": "يرجى تعبئة هذا الحقل.",
    "common.optional": "اختياري",
    "common.private": "خاص",
  },
} as const;

export type TKey = keyof (typeof DICT)["en"];

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
};

const LangContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "tracker.lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read the saved choice after mount, so server and client render the same HTML first.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (key: TKey) => DICT[lang][key] ?? DICT.en[key] ?? key,
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className={`rounded-full border border-cream-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-cream-50 ${className}`}
      aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
    >
      {lang === "en" ? "عربي" : "EN"}
    </button>
  );
}
