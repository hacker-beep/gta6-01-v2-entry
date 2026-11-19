const jobs = [
  ['Borrowed Weather', 'Carry the ledger to Inez at Kite & Key.', 'Mara owes $4,200. Inez offers a first way out.', 9, 450],
  ['Salt in the Books', 'Collect the archive case outside Tideglass Bank.', 'The ledger ties Dax Rook to missing harbor funds.', 10, 500],
  ['Soft Landing', 'Lose the police, then meet the marina contact.', 'Detective Sol Reyes knows Mara’s plate.', 6, 600],
  ['The Long Receipt', 'Recover three courier caches around Bellwether.', 'Every favor leaves a paper trail.', 3, 700],
  ['Quay Change', 'Steal a van and deliver it to the safehouse.', 'Inez needs wheels that will pass at the docks.', 13, 800],
  ['Glasshouse Run', 'Drive the evidence to the Crownline service door.', 'A witness can erase the debt.', 8, 850],
  ['Night Shift', 'Hold the Cobalt meeting point for eight seconds.', 'Reyes offers immunity if the ledger survives.', 5, 900],
  ['False Summer', 'Steal a Marlin GT and reach Tern Island.', 'Rook is moving the witnesses offshore.', 11, 950],
  ['Breakwater', 'Disable the dockside relay on foot.', 'The harbor cameras are Rook’s eyes.', 7, 1100],
  ['Paper Crown', 'Take the casino drive and escape a three-star pursuit.', 'The ledger names everyone who got paid.', 8, 1200],
  ['Open Channel', 'Reach Signal House with no police on your tail.', 'Reyes gives Mara one clean minute on air.', 10, 1300],
  ['No Safe Harbor', 'Defeat two guards and rescue Inez.', 'Rook has decided a prisoner is worth more than a debt.', 7, 1500],
  ['Dead Reckoning', 'Bring a Crownline S to the Morrow Park rendezvous.', 'Reyes has the route. Inez has the vault key.', 12, 1700],
  ['Low Tide', 'Hold the bank entrance for ten seconds.', 'The last withdrawal is evidence.', 10, 2200],
  ['A Bay of Lights', 'Escape pursuit and reach the South Ferry.', 'Mara can pay the debt or expose Rook. Tonight, both.', 13, 4000],
];

export const STORY_MISSIONS = jobs.map(([name, objective, dialogue, district, reward], index) => ({
  id: index, act: Math.floor(index / 5) + 1, name, objective, dialogue, district, reward,
  target: { x: ((district % 6) - 2.5) * 72, z: (Math.floor(district / 2) - 3) * 72 },
}));
