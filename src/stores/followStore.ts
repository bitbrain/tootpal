import { defineStore } from 'pinia'

interface Account {
  id: string
}

export const useFollowStore = defineStore('followStore', {
  state: () => ({
    follows: [] as Account[],
  }),
  getters: {
    isFollowing: state => (id: string) => {
      return state.follows.some(f => f.id === id)
    },
  },
  actions: {
    addFollower(id: string) {
      this.follows.push({ id })
    },
    setFollowers(accounts: string[]) {
      this.follows = accounts.map(id => ({
        id,
      }))
    },
    clear() {
      this.follows = []
    },
  },
})
