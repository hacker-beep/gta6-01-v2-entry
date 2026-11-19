const KEY = 'vermilion-bay-v2-save';
export class SaveGame {
  constructor(state, missions, shops, reputation) { this.state=state;this.missions=missions;this.shops=shops;this.reputation=reputation;this.available=true; }
  save() {
    const data={money:this.state.values.money,respect:this.state.values.respect,wanted:this.state.values.wanted,mission:this.missions.index,completed:this.missions.completed,upgrades:[...this.shops.owned],heat:this.state.wantedSystem?.snapshot().districtHeat||{}};
    try{localStorage.setItem(KEY,JSON.stringify(data));this.available=true;return data;}catch{this.available=false;return null;}
  }
  load() {
    try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(!data)return false;this.state.setMoney(data.money||0);this.state.setRespect(data.respect||0);this.state.setWantedLevel(data.wanted||0);this.missions.index=data.mission||0;this.missions.completed=data.completed||[];this.shops.owned=new Set(data.upgrades||[]);for(const [id,value] of Object.entries(data.heat||{}))this.state.wantedSystem?.heat.set(Number(id),value);return true;}catch{this.available=false;return false;}
  }
  snapshot(){return {available:this.available,key:KEY};}
}
