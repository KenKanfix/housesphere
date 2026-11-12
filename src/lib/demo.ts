import {
  addDaysISO,
  db,
  ensureDefaults,
  now,
  type DocumentType,
  type ExpenseCategory,
  type MaintenanceCategory,
  type ProjectStatus,
  uid,
} from './db'

export async function loadDemoData(): Promise<boolean> {
  await ensureDefaults()

  const existing = await db.items.count()
  if (existing > 0) return false

  const rooms = await db.rooms.toArray()
  const roomId = (name: string) => rooms.find((room) => room.name === name)?.id ?? rooms[0]?.id ?? ''

  const timestamp = now()

  const providers = [
    {
      id: uid(),
      name: 'CoolAir Services',
      trade: 'HVAC technician',
      phone: '0402 118 774',
      email: 'bookings@coolair.example',
      rating: 5,
      notes: 'Annual air conditioner service. Text ahead to confirm the time.',
    },
    {
      id: uid(),
      name: 'Bright Spark Electrical',
      trade: 'Electrician',
      phone: '0411 905 220',
      email: 'hello@brightspark.example',
      rating: 5,
      notes: 'Licensed electrician. Handles switchboard and safety switch work.',
    },
    {
      id: uid(),
      name: 'FlowFix Plumbing',
      trade: 'Plumber',
      phone: '0433 220 118',
      email: 'service@flowfix.example',
      rating: 4,
      notes: 'Same-day plumbing repairs.',
    },
    {
      id: uid(),
      name: 'Hartley Build Co',
      trade: 'Builder',
      phone: '0421 660 431',
      email: 'quotes@hartleybuild.example',
      rating: 5,
      notes: 'Kitchen and deck renovations.',
    },
    {
      id: uid(),
      name: 'Green Thumb Gardens',
      trade: 'Gardener',
      phone: '0455 771 003',
      email: 'green@thumb.example',
      rating: 4,
      notes: 'Garden maintenance every six weeks.',
    },
  ].map((provider) => ({ ...provider, createdAt: timestamp, updatedAt: timestamp }))

  const coolAir = providers[0].id
  const brightSpark = providers[1].id
  const flowFix = providers[2].id
  const hartley = providers[3].id

  const items = [
    {
      name: 'French Door Fridge',
      roomId: roomId('Kitchen'),
      category: 'Appliance' as const,
      brand: 'Samsung',
      model: 'SRF5700SD',
      serial: 'SAM-487-2211',
      purchaseDate: '2023-11-18',
      price: 1899,
      notes: '487L. Water filter replaced every six months.',
    },
    {
      name: 'Serie 6 Dishwasher',
      roomId: roomId('Kitchen'),
      category: 'Appliance' as const,
      brand: 'Bosch',
      model: 'SMS6ZCW00A',
      serial: 'BSH-6612-8842',
      purchaseDate: '2022-06-04',
      price: 1299,
      notes: 'Rinse aid light comes on roughly every six weeks.',
    },
    {
      name: 'C3 65" OLED TV',
      roomId: roomId('Living Room'),
      category: 'Electronics' as const,
      brand: 'LG',
      model: 'OLED65C3PSA',
      serial: 'LG-OLED-7783',
      purchaseDate: '2024-03-22',
      price: 3299,
      notes: 'Wall mounted. Original remote in the TV cabinet.',
    },
    {
      name: 'V12 Cordless Vacuum',
      roomId: roomId('Laundry'),
      category: 'Appliance' as const,
      brand: 'Dyson',
      model: 'SV46',
      serial: 'DYS-1209-5531',
      purchaseDate: '2023-09-10',
      price: 1099,
      notes: 'Filter washed monthly. Spare battery in the garage.',
    },
    {
      name: 'Spirit II BBQ',
      roomId: roomId('Garden'),
      category: 'Outdoor' as const,
      brand: 'Weber',
      model: 'E-310',
      serial: 'WEB-310-6620',
      purchaseDate: '2021-12-05',
      price: 899,
      notes: 'Cover kept under the house. Gas bottle swap at the local servo.',
    },
    {
      name: 'Washing Machine',
      roomId: roomId('Laundry'),
      category: 'Appliance' as const,
      brand: 'Fisher & Paykel',
      model: 'WH8060J3',
      serial: 'FP-8060-1198',
      purchaseDate: '2020-08-20',
      price: 1499,
      notes: 'Clean the lint filter monthly.',
    },
    {
      name: 'Lounge Suite',
      roomId: roomId('Living Room'),
      category: 'Furniture' as const,
      brand: 'Koala',
      model: 'Cushion Sofa',
      purchaseDate: '2022-02-15',
      price: 2400,
      notes: 'Covers are machine washable.',
    },
    {
      name: '18V Lawn Mower',
      roomId: roomId('Garage'),
      category: 'Outdoor' as const,
      brand: 'Ryobi',
      model: 'RLM18X38',
      serial: 'RYO-1838-4402',
      purchaseDate: '2024-10-02',
      price: 649,
      notes: 'Shares batteries with the trimmer.',
    },
  ].map((item) => ({
    ...item,
    id: uid(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  const fridge = items[0]
  const dishwasher = items[1]
  const tv = items[2]
  const vacuum = items[3]
  const washingMachine = items[5]
  const mower = items[7]

  const warranties = [
    {
      title: 'Samsung fridge — 5 year cover',
      itemId: fridge.id,
      provider: 'Samsung',
      purchaseDate: '2023-11-18',
      expiryDate: '2028-11-18',
      notes: 'Keep the original invoice for claims.',
    },
    {
      title: 'Bosch dishwasher — 2 year cover',
      itemId: dishwasher.id,
      provider: 'Bosch',
      purchaseDate: '2022-06-04',
      expiryDate: addDaysISO(24),
      notes: 'Extended cover was not purchased.',
    },
    {
      title: 'LG OLED TV — 1 year cover',
      itemId: tv.id,
      provider: 'LG',
      purchaseDate: '2024-03-22',
      expiryDate: addDaysISO(-12),
      notes: 'Expired. Consider adding to contents insurance.',
    },
    {
      title: 'Dyson V12 — 2 year cover',
      itemId: vacuum.id,
      provider: 'Dyson',
      purchaseDate: '2023-09-10',
      expiryDate: addDaysISO(87),
      notes: '',
    },
    {
      title: 'Fisher & Paykel washer — 2 year cover',
      itemId: washingMachine.id,
      provider: 'Fisher & Paykel',
      purchaseDate: '2020-08-20',
      expiryDate: addDaysISO(-320),
      notes: 'Expired long ago.',
    },
    {
      title: 'Ryobi mower — 4 year cover',
      itemId: mower.id,
      provider: 'Ryobi',
      purchaseDate: '2024-10-02',
      expiryDate: addDaysISO(410),
      notes: 'Register the product online to activate the extra year.',
    },
  ].map((warranty) => ({ ...warranty, id: uid(), createdAt: timestamp, updatedAt: timestamp }))

  const maintenance = [
    {
      title: 'Service air conditioners',
      category: 'HVAC' as MaintenanceCategory,
      intervalDays: 365,
      lastCompleted: addDaysISO(-353),
      nextDue: addDaysISO(12),
      estimatedCost: 220,
      providerId: coolAir,
      notes: 'Two split systems: living room and main bedroom.',
    },
    {
      title: 'Clean gutters',
      category: 'Exterior' as MaintenanceCategory,
      intervalDays: 180,
      lastCompleted: addDaysISO(-184),
      nextDue: addDaysISO(-4),
      estimatedCost: 180,
      notes: 'Check downpipes while the gutters are being cleared.',
    },
    {
      title: 'Test smoke alarms',
      category: 'Safety' as MaintenanceCategory,
      intervalDays: 180,
      lastCompleted: addDaysISO(-140),
      nextDue: addDaysISO(40),
      estimatedCost: 0,
      notes: 'Replace batteries every 12 months.',
    },
    {
      title: 'Service hot water system',
      category: 'Plumbing' as MaintenanceCategory,
      intervalDays: 730,
      lastCompleted: addDaysISO(-700),
      nextDue: addDaysISO(30),
      estimatedCost: 160,
      providerId: flowFix,
      notes: 'Check the pressure relief valve.',
    },
    {
      title: 'Replace HVAC filters',
      category: 'HVAC' as MaintenanceCategory,
      intervalDays: 90,
      lastCompleted: addDaysISO(-80),
      nextDue: addDaysISO(10),
      estimatedCost: 45,
      notes: 'Two filters, 20x25 inch.',
    },
    {
      title: 'Mow the lawn',
      category: 'Garden' as MaintenanceCategory,
      intervalDays: 30,
      lastCompleted: addDaysISO(-25),
      nextDue: addDaysISO(5),
      estimatedCost: 0,
      providerId: providers[4].id,
      notes: '',
    },
    {
      title: 'Check electrical safety switches',
      category: 'Electrical' as MaintenanceCategory,
      intervalDays: 365,
      lastCompleted: addDaysISO(-200),
      nextDue: addDaysISO(165),
      estimatedCost: 0,
      providerId: brightSpark,
      notes: 'Press the test button on each safety switch.',
    },
  ].map((task) => ({ ...task, id: uid(), createdAt: timestamp, updatedAt: timestamp }))

  const projects = [
    {
      title: 'Kitchen refresh',
      status: 'in_progress' as ProjectStatus,
      budget: 8500,
      startDate: addDaysISO(-40),
      targetDate: addDaysISO(45),
      providerId: hartley,
      description: 'New splashback, bench tops and paint. Keep the existing cabinets.',
    },
    {
      title: 'Backyard deck',
      status: 'planning' as ProjectStatus,
      budget: 12000,
      startDate: addDaysISO(35),
      targetDate: addDaysISO(130),
      providerId: hartley,
      description: 'Merbau deck, about 24 square metres, with built-in seating.',
    },
    {
      title: 'Solar and battery',
      status: 'completed' as ProjectStatus,
      budget: 9800,
      startDate: addDaysISO(-210),
      targetDate: addDaysISO(-150),
      description: '6.6kW panels with a 10kWh battery.',
    },
  ].map((project) => ({ ...project, id: uid(), createdAt: timestamp, updatedAt: timestamp }))

  const documentSeed: {
    title: string
    type: DocumentType
    issuer?: string
    reference?: string
    issueDate?: string
    expiryDate?: string
    amount?: number
    notes?: string
  }[] = [
    {
      title: 'Home & contents insurance',
      type: 'insurance',
      issuer: 'Suncorp',
      reference: 'POL-8841-2209',
      issueDate: addDaysISO(-300),
      expiryDate: addDaysISO(65),
      amount: 1480,
      notes: 'Building sum insured $620,000. Contents $120,000.',
    },
    {
      title: 'Building & pest inspection',
      type: 'inspection',
      issuer: 'SafeHome Inspections',
      reference: 'INS-2024-117',
      issueDate: addDaysISO(-420),
      notes: 'Report highlights minor rising damp on the north wall.',
    },
    {
      title: 'Bosch dishwasher manual',
      type: 'manual',
      issuer: 'Bosch',
      reference: 'SMS6ZCW00A',
      issueDate: '2022-06-04',
      notes: 'Error codes and cleaning instructions.',
    },
    {
      title: 'Council rates notice',
      type: 'other',
      issuer: 'City Council',
      reference: 'RATES-2025-4471',
      issueDate: addDaysISO(-280),
      expiryDate: addDaysISO(80),
      amount: 720,
      notes: 'Second instalment due in eight weeks.',
    },
    {
      title: 'Solar system warranty certificate',
      type: 'manual',
      issuer: 'SunRun Energy',
      reference: 'SR-6600-2025',
      issueDate: addDaysISO(-160),
      expiryDate: addDaysISO(3400),
      notes: 'Panels 25 years, inverter 10 years, battery 10 years.',
    },
  ]

  const documents = documentSeed.map((document) => ({ ...document, id: uid(), createdAt: timestamp, updatedAt: timestamp }))

  const expenseSeed: {
    category: ExpenseCategory
    amount: number
    vendor?: string
    description?: string
    date: string
    projectId?: string
  }[] = [
    { category: 'electricity', amount: 186.4, vendor: 'AGL', description: 'Monthly electricity bill', date: addDaysISO(-3) },
    { category: 'water', amount: 98.2, vendor: 'Sydney Water', description: 'Quarterly water bill', date: addDaysISO(-10) },
    { category: 'gas', amount: 74.5, vendor: 'Origin Energy', description: 'Monthly gas bill', date: addDaysISO(-15) },
    { category: 'maintenance', amount: 220, vendor: 'CoolAir Services', description: 'Air conditioner service', date: addDaysISO(-30) },
    { category: 'project', amount: 1240, vendor: 'Tile & Co', description: 'Kitchen splashback tiles', date: addDaysISO(-20), projectId: projects[0].id },
    { category: 'project', amount: 860, vendor: 'Bunnings', description: 'Paint, sealant and supplies', date: addDaysISO(-8), projectId: projects[0].id },
    { category: 'appliance', amount: 129, vendor: 'Appliances Online', description: 'Replacement microwave', date: addDaysISO(-60) },
    { category: 'insurance', amount: 1480, vendor: 'Suncorp', description: 'Home & contents premium', date: addDaysISO(-300) },
    { category: 'other', amount: 720, vendor: 'City Council', description: 'Council rates instalment', date: addDaysISO(-90) },
    { category: 'electricity', amount: 201.3, vendor: 'AGL', description: 'Monthly electricity bill', date: addDaysISO(-34) },
    { category: 'water', amount: 88.6, vendor: 'Sydney Water', description: 'Quarterly water bill', date: addDaysISO(-50) },
    { category: 'gas', amount: 112.2, vendor: 'Origin Energy', description: 'Monthly gas bill', date: addDaysISO(-70) },
    { category: 'maintenance', amount: 150, vendor: 'FlowFix Plumbing', description: 'Leaking tap repair', date: addDaysISO(-80) },
    { category: 'electricity', amount: 174.9, vendor: 'AGL', description: 'Monthly electricity bill', date: addDaysISO(-64) },
  ]

  const expenses = expenseSeed.map((expense) => ({
    ...expense,
    id: uid(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  const serviceRecords = [
    {
      providerId: coolAir,
      date: addDaysISO(-353),
      description: 'Annual service of both split systems. Gas topped up.',
      cost: 220,
    },
    {
      providerId: brightSpark,
      date: addDaysISO(-150),
      description: 'Replaced two power points and tested safety switches.',
      cost: 340,
    },
    {
      providerId: flowFix,
      date: addDaysISO(-80),
      description: 'Replaced the mixer tap cartridge in the main bathroom.',
      cost: 150,
    },
    {
      providerId: providers[4].id,
      date: addDaysISO(-25),
      description: 'Fortnightly garden maintenance and lawn mowing.',
      cost: 90,
    },
  ].map((record) => ({ ...record, id: uid(), createdAt: timestamp }))

  await db.transaction(
    'rw',
    [db.providers, db.items, db.warranties, db.maintenance, db.projects, db.documents, db.expenses, db.serviceRecords],
    async () => {
      await db.providers.bulkAdd(providers)
      await db.items.bulkAdd(items)
      await db.warranties.bulkAdd(warranties)
      await db.maintenance.bulkAdd(maintenance)
      await db.projects.bulkAdd(projects)
      await db.documents.bulkAdd(documents)
      await db.expenses.bulkAdd(expenses)
      await db.serviceRecords.bulkAdd(serviceRecords)
    },
  )

  return true
}
