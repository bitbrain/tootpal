import { defineStore } from 'pinia'

interface FollowEntry {
  id: string
  acct?: string
}

export const useFollowStore = defineStore('followStore', {
  state: () => ({
    follows: [] as FollowEntry[],
  }),
  getters: {
    isFollowing: state => (id: string) => {
      return state.follows.some(f => f.id === id)
    },
    isFollowingAcct: state => (acct: string) => {
      return state.follows.some(f => f.acct && f.acct.toLowerCase() === acct.toLowerCase())
    },
  },
  actions: {
    addFollower(id: string, acct?: string) {
      this.follows.push({ id, acct })
    },
    setFollowers(accounts: string[]) {
      this.follows = accounts.map(id => ({ id }))
    },
    setFollowersWithAcct(accounts: { id: string; acct?: string }[]) {
      this.follows = accounts.map(a => ({ id: a.id, acct: a.acct }))
    },
    clear() {
      this.follows = []
    },
  },
})
